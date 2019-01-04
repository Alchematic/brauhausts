import convert from 'convert-units';
import * as _ from 'lodash';
import { Fermentable } from './fermentable';
import { GLOBALS } from './globals';
import { computeMashStepDescription, createMash, Mash, MashStep } from './mash';
import { computeRecipeGrainWeight, Recipe } from './recipe';
import { Spice } from './spice';
import { computeDisplayDuration, computeTimeToCool, computeTimeToHeat, convertKgToLbOz } from './utils';
import { Yeast } from './yeast';

export type TimelineMap = {
  fermentables: TimelineFermentables;
  times: { [key: number]: TimelineSpice[] };
  drySpice: { [key: number]: TimelineSpice[] };
  yeast: Yeast[];
};

type TimelineFermentables = {
  mash: TimelineFermentable[];
  steep: TimelineFermentable[];
  boil: TimelineFermentable[];
  boilEnd: TimelineFermentable[];
};

type TimelineFermentable = {
  fermentable: Fermentable;
  gravity: number;
};

type TimelineSpice = {
  spice: Spice;
  bitterness: number;
};

type BrewState = {
  timeline: { time: number; instructions: string }[];
  volume: number;
  temp: number;
  time: number;
  isSiUnits: boolean;
};

/**
 * Compute the number of servings a recipe can create
 */
const computeRecipeServings = (recipe: Recipe) => Math.floor(recipe.batchSize / recipe.servingSize);

/**
 * Get a list of fermentable descriptions taking siUnits into account
 */
const createFermentableIngredientList = (fermentables: TimelineFermentable[], isSiUnits = true) =>
  _.map(fermentables, ({ fermentable, gravity }) => {
    const weight = isSiUnits ? `${fermentable.weight.toFixed(2)}kg` : convertKgToLbOz(fermentable.weight);

    return `${weight} of ${fermentable.name} (${gravity.toFixed(1)} GU)`;
  });

/**
 * Get a list of spice descriptions taking siUnits into account
 */
const createSpiceIngredientList = (spices: TimelineSpice[], isSiUnits = true) =>
  _.map(spices, ({ spice, bitterness }) => {
    const weight = isSiUnits ? `${spice.weight * 1000}g` : convertKgToLbOz(spice.weight);
    const ibu = bitterness ? ` (${bitterness.toFixed(1)} IBU)` : '';

    return `${weight} of ${spice.name}${ibu}`;
  });

const generateMashStepVolumeAdd = (
  step: Readonly<MashStep>,
  recipe: Readonly<Recipe>,
  strikeVolume: number,
  currentState: BrewState,
): BrewState => {
  // We are adding hot or cold water!
  // 4.184 is the specific heat of water. Not sure what's being computed here.
  const strikeTemp =
    ((step.temp - currentState.temp) * ((GLOBALS.SPECIFIC_HEAT_OF_WATER / 10) * computeRecipeGrainWeight(recipe))) /
      strikeVolume +
    step.temp;
  const timeToHeat = computeTimeToHeat(strikeVolume, strikeTemp - currentState.temp);

  const strikeVolumeDesc = currentState.isSiUnits
    ? `${strikeVolume.toFixed(1)}l`
    : `${convert(strikeVolume)
        .from('l')
        .to('qt')}qts`;

  const strikeTempDesc = currentState.isSiUnits
    ? `${Math.round(strikeTemp)}°C`
    : `${Math.round(
        convert(strikeTemp)
          .from('C')
          .to('F'),
      )}°F`;

  return {
    ...currentState,
    timeline: _.concat(currentState.timeline, {
      time: currentState.time,
      instructions: `Heat ${strikeVolumeDesc} to ${strikeTempDesc} (about ${Math.round(timeToHeat)} minutes)`,
    }),
    time: timeToHeat + currentState.time,
    volume: strikeVolume + currentState.volume,
  };
};

const generateMashStepHeat = (step: MashStep, currentState: BrewState) => {
  let heatTemp = '';
  const timeToHeat = computeTimeToHeat(currentState.volume, step.temp - currentState.temp);

  if (currentState.isSiUnits) {
    heatTemp = `${Math.round(step.temp)}°C`;
  } else {
    heatTemp = `${Math.round(
      convert(step.temp)
        .from('C')
        .to('F'),
    )}°F`;
  }

  return {
    ...currentState,
    timeline: _.concat(currentState.timeline, {
      time: currentState.time,
      instructions: `Heat the mash to ${heatTemp} (about ${Math.round(timeToHeat)} minutes)`,
    }),
    time: currentState.time + timeToHeat,
  };
};

const computeMashPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  const mash = createMash(recipe, currentState.temp, recipe.mash);

  const ingredients = createFermentableIngredientList(recipe.timelineMap.fermentables.mash);
  currentState.timeline.push({
    time: currentState.time,
    instructions: `Begin ${mash.name} mash. Add ${ingredients.join(', ')}.`,
  });

  const steps = recipe.mash.steps;

  _.each(steps, step => {
    const strikeVolume = step.waterRatio * computeRecipeGrainWeight(recipe) - currentState.volume;

    if (step.temp !== currentState.temp && strikeVolume > 0) {
      currentState = generateMashStepVolumeAdd(step, recipe, strikeVolume, currentState);
    } else if (step.temp !== currentState.temp) {
      currentState = generateMashStepHeat(step, currentState);
    }

    currentState.timeline.push({
      time: currentState.time,
      instructions: `${step.name}: ${computeMashStepDescription(
        step,
        currentState.isSiUnits,
        computeRecipeGrainWeight(recipe),
      )}.`,
    });
    currentState.time += step.time;
    currentState.temp = step.temp - (step.time * GLOBALS.MASH_HEAT_LOSS) / 60.0;
  });

  currentState.timeline.push({
    time: currentState.time,
    instructions: 'Remove grains from mash. This is now your wort.',
  });
  currentState.time += 5;

  return currentState;
};

const computeSteepPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  let steepWeight = 0;

  _.each(recipe.timelineMap.fermentables.steep, ({ fermentable }) => {
    steepWeight += fermentable.weight;
  });

  const STEEP_LITERS_PER_KG = 2.75;
  const STEEP_TEMP = 68;
  const steepVolume = steepWeight * STEEP_LITERS_PER_KG;

  const steepHeatTime = computeTimeToHeat(steepVolume, STEEP_TEMP - currentState.temp);
  currentState.temp = STEEP_TEMP;
  currentState.volume += steepVolume;

  const steepVolumeText = currentState.isSiUnits
    ? `${steepVolume.toFixed(1)}l`
    : `${convert(steepVolume)
        .from('l')
        .to('gal')
        .toFixed(1)}gal`;
  const steepTemp = currentState.isSiUnits
    ? `${STEEP_TEMP}°C`
    : `${convert(STEEP_TEMP)
        .from('C')
        .to('F')
        .toFixed(1)}°F`;

  currentState.timeline.push({
    time: currentState.time,
    instructions: `Heat ${steepVolumeText} to ${steepTemp} (about ${Math.round(steepHeatTime)} minutes)`,
  });
  currentState.time += steepHeatTime;

  const ingredients = createFermentableIngredientList(recipe.timelineMap.fermentables.steep);
  currentState.timeline.push({
    time: currentState.time,
    instructions: `Add ${ingredients.join(', ')} and steep for ${recipe.steepTime} minutes.`,
  });
  currentState.time += recipe.steepTime;

  return currentState;
};

const computeTopUpStep = (recipe: Recipe, currentState: BrewState, boilName: string) => {
  // Adjust temperature based on added water
  const waterChangeRatio = Math.min(1, currentState.volume / recipe.boilSize);
  currentState.temp = currentState.temp * waterChangeRatio + GLOBALS.ROOM_TEMP * (1.0 - waterChangeRatio);

  const boilVolume = currentState.isSiUnits
    ? `${recipe.boilSize.toFixed(1)}l`
    : `${convert(recipe.boilSize)
        .from('l')
        .to('gal')
        .toFixed(1)}gal`;

  // Old: recipe.boilSize - currentState.volume < recipe.boilSize
  // ^ That's equivalent to currentState.volume > 0
  const action =
    currentState.volume > 0
      ? `Top up the ${boilName} to ${boilVolume} and heat to a rolling boil`
      : `Bring ${boilVolume} to a rolling boil`;

  const boilTime = computeTimeToHeat(recipe.boilSize, 100 - currentState.temp);
  currentState.timeline.push({ time: currentState.time, instructions: `${action} (about ${boilTime} minutes).` });
  currentState.time += boilTime;

  return currentState;
};

const computeBoilPhase = (recipe: Recipe, currentState: BrewState) => {
  const times = _.orderBy(Object.keys(recipe.timelineMap.times), _.parseInt, 'desc');

  // If we have late additions and no late addition time, add it
  if (!_.isEmpty(recipe.timelineMap.fermentables.boilEnd) && !_.includes(times, '5')) {
    recipe.timelineMap.times[5] = [];
    times.push('5');
  }

  // Add fermentables that need to be boiled for a certain amount of time.
  let previousSpiceTime = 0;
  _.each(times, (unparsedTime, index) => {
    const time = parseInt(unparsedTime);
    let ingredients = createSpiceIngredientList(recipe.timelineMap.times[time]);

    if (index === 0) {
      const boilIngredients = createFermentableIngredientList(recipe.timelineMap.fermentables.boil);
      ingredients = _.concat(boilIngredients, ingredients);
      previousSpiceTime = time;
    }

    currentState.time += previousSpiceTime - time;

    previousSpiceTime = time;

    if (time === 5 && recipe.timelineMap.fermentables.boilEnd.length) {
      const boilEndIngredients = createFermentableIngredientList(recipe.timelineMap.fermentables.boilEnd);
      ingredients = _.concat(boilEndIngredients, ingredients);
    }

    currentState.timeline.push({ time: currentState.time, instructions: `Add ${ingredients.join(', ')}` });
  });

  currentState.time += previousSpiceTime;

  return currentState;
};

/**
 * Compute a recipe's timeline of instructions
 */
export const computeRecipeTimeline = (recipe: Readonly<Recipe>, isSiUnits = true) => {
  let boilName = 'water';
  let currentState: BrewState = {
    timeline: [],
    time: 0,
    temp: GLOBALS.ROOM_TEMP,
    volume: 0,
    isSiUnits: isSiUnits,
  };

  if (_.size(recipe.timelineMap.fermentables.mash) > 0) {
    boilName = 'wort';
    currentState = computeMashPhase(recipe, currentState);
  }

  if (recipe.timelineMap.fermentables.steep.length) {
    boilName = 'wort';
    currentState = computeSteepPhase(recipe, currentState);
  }

  currentState = computeTopUpStep(recipe, currentState, boilName);

  // Removed mutation
  // recipe.boilStartTime = currentState.time;

  currentState = computeBoilPhase(recipe, currentState);

  // Removed mutation
  // recipe.boilEndTime = currentState.time;

  const chillTemp = isSiUnits
    ? `${recipe.primaryTemp}°C`
    : `${convert(recipe.primaryTemp)
        .from('C')
        .to('F')}°F`;

  computeTimeToCool(currentState.volume, 100, recipe.primaryTemp);
  currentState.timeline.push({
    time: currentState.time,
    instructions: `Flame out. Begin chilling to ${chillTemp} and aerate the cooled wort (about 20 minutes).`,
  });
  currentState.time += 20;

  let yeasts = _.map(recipe.yeast, 'name');

  if (_.isEmpty(yeasts) && recipe.primaryDays) {
    // No yeast given, but primary fermentation should happen...
    // Let's just use a generic "yeast" to pitch.
    yeasts = ['yeast'];
  }

  if (yeasts.length) {
    currentState.timeline.push({
      time: currentState.time,
      instructions: `Pitch ${yeasts.join(
        ', ',
      )} and seal the fermenter. You should see bubbles in the airlock within 24 hours.`,
    });
  }

  // The brew day is over! Fermenting starts now.
  // Removed mutation
  // recipe.brewDayDuration = currentState.time;

  if (!recipe.primaryDays && !recipe.secondaryDays && !recipe.tertiaryDays) {
    currentState.timeline.push({
      time: currentState.time,
      instructions: `Drink immediately (about ${computeRecipeServings(recipe)} bottles).`,
    });

    return currentState.timeline;
  }

  currentState.time += recipe.primaryDays * 1440;

  if (recipe.secondaryDays) {
    currentState.timeline.push({
      time: currentState.time,
      instructions: `Move to secondary fermenter for ${computeDisplayDuration(recipe.secondaryDays * 1440, 2)}.`,
    });
    currentState.time += recipe.secondaryDays * 1440;
  }
  if (recipe.tertiaryDays) {
    currentState.timeline.push({
      time: currentState.time,
      instructions: `Move to tertiary fermenter for ${computeDisplayDuration(recipe.tertiaryDays * 1440, 2)}.`,
    });
    currentState.time += recipe.tertiaryDays * 1440;
  }
  let primeMsg = `Prime and bottle about ${computeRecipeServings(recipe)} bottles.`;

  if (recipe.agingDays) {
    let ageTemp = '';
    if (isSiUnits) {
      ageTemp = `${recipe.agingTemp}C`;
    } else {
      ageTemp = `${convert(recipe.agingTemp)
        .from('C')
        .to('F')}F`;
    }

    primeMsg += ` Age at ${ageTemp} for ${recipe.agingDays} days.`;
  }
  currentState.timeline.push({ time: currentState.time, instructions: primeMsg });
  currentState.time += recipe.agingDays * 1440;

  currentState.timeline.push({ time: currentState.time, instructions: "Relax, don't worry and have a homebrew!" });

  return currentState.timeline;
};
