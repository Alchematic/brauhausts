import convert from 'convert-units';
import * as _ from 'lodash';
import { Fermentable, FermentableUse } from './fermentable';
import { GLOBALS } from './globals';
import { computeMashStepDescription, createMash, MashStep } from './mash';
import { computeGrainWeight, Recipe } from './recipe';
import { Spice } from './spice';
import {
  computeDisplayDuration,
  computeTempString,
  computeTimeToHeat,
  computeVolumeString,
  convertKgToLbOz,
} from './utils';
import { Yeast } from './yeast';

export type TimelineMap = {
  fermentables: TimelineFermentables;
  times: { [key: number]: TimelineSpice[] };
  drySpice: { [key: number]: TimelineSpice[] };
  yeast: Yeast[];
};

type TimelineFermentables = { [key in FermentableUse]: TimelineFermentable[] };

export type TimelineFermentable = {
  fermentable: Fermentable;
  gravity: number;
};

type TimelineSpice = {
  spice: Spice;
  bitterness: number;
};

export type Timeline = { time: number; instructions: string; phase: string; duration?: number }[];

type BrewState = {
  timeline: Timeline;
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
    let siWeight = `${fermentable.weight.toFixed(2)}kg`;
    if (siWeight === '0.00kg') {
      siWeight = `${convert(fermentable.weight)
        .from('kg')
        .to('g')
        .toFixed(2)}g`;
    }
    const weight = isSiUnits ? siWeight : convertKgToLbOz(fermentable.weight);

    return `${weight} of ${fermentable.name} (${gravity.toFixed(1)} GU)`;
  });

/**
 * Get a list of spice descriptions taking siUnits into account
 */
const createSpiceIngredientList = (spices: TimelineSpice[], isSiUnits = true) =>
  _.map(spices, ({ spice, bitterness }) => {
    const weight = isSiUnits ? `${(spice.weight * 1000).toFixed(0)}g` : convertKgToLbOz(spice.weight);
    const ibu = bitterness ? ` (${bitterness.toFixed(1)} IBU)` : '';

    return `${weight} of ${spice.name}${ibu}`;
  });

/**
 * Generate the amount of water to add for a mash step
 */
const generateMashStepVolumeAdd = (
  step: Readonly<MashStep>,
  recipeGrainWeight: number,
  strikeVolume: number,
  currentState: BrewState,
): BrewState => {
  // We are adding hot or cold water!
  // 4.184 is the specific heat of water. Not sure what's being computed here.
  // Update: I think this is the temperature the mash should be before adding grains, which will cool it.
  const strikeTemp =
    ((step.temp - currentState.temp) * ((GLOBALS.SPECIFIC_HEAT_OF_WATER / 10) * recipeGrainWeight)) / strikeVolume +
    step.temp;
  const timeToHeat = computeTimeToHeat(strikeVolume, strikeTemp - currentState.temp);

  const strikeVolumeDesc = currentState.isSiUnits
    ? `${strikeVolume.toFixed(1)}l`
    : `${convert(strikeVolume)
        .from('l')
        .to('qt')
        .toFixed(1)}qts`;

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
      instructions: `Heat ${strikeVolumeDesc} to ${strikeTempDesc} (about ${Math.round(
        timeToHeat,
      )} minutes). Add the heated water to your mash tun.`,
      phase: 'mash',
    }),
    temp: strikeTemp,
    time: timeToHeat + currentState.time,
    volume: strikeVolume + currentState.volume,
  };
};

/**
 * Generate a step which will just heat the mash. Not sure how this works. If my understanding of mashing is correct,
 * you wouldn't heat the mash directly.
 */
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
      phase: 'mash',
    }),
    time: currentState.time + timeToHeat,
  };
};

/**
 * Computes the phase in which malt sugars are released by soaking grains in water
 */
const computeMashPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  if (_.isEmpty(recipe.timelineMap.fermentables.mash)) {
    return currentState;
  }
  const mash = createMash(recipe, currentState.temp, recipe.mash);

  const ingredients = createFermentableIngredientList(recipe.timelineMap.fermentables.mash);
  currentState.timeline.push({
    time: currentState.time,
    instructions: `Begin mash. Prepare ${ingredients.join(', ')}.`,
    phase: 'mash',
  });

  const steps = recipe.mash.steps;
  const recipeGrainWeight = computeGrainWeight(recipe.fermentables);
  let addedIngredients = false;

  _.each(steps, (step, stepIndex) => {
    const strikeVolume = step.waterRatio * recipeGrainWeight - currentState.volume;

    if (step.temp !== currentState.temp && strikeVolume > 0) {
      currentState = generateMashStepVolumeAdd(step, recipeGrainWeight, strikeVolume, currentState);
    }
    // TODO: Leaving here incase we need for later. As far as I can tell the actual mash steps will indicate if a mash needs
    // to be heated directly, but I could definitely be wrong. Could use some help validating.
    // } else if (step.temp !== currentState.temp) {
    //   currentState = generateMashStepHeat(step, currentState);
    // }

    if (!addedIngredients) {
      currentState.timeline.push({
        time: currentState.time,
        instructions: `Add ${ingredients.join(', ')} directly to the mash until all the grains are covered by water.`,
        phase: 'mash',
      });
      addedIngredients = true;
    }

    currentState.timeline.push({
      time: currentState.time,
      instructions: computeMashStepDescription(step, stepIndex, currentState.isSiUnits, recipeGrainWeight),
      phase: 'mash',
    });

    currentState.time += step.time;
    currentState.temp = step.temp - (step.time * GLOBALS.MASH_HEAT_LOSS) / 60.0;
  });

  currentState.timeline.push({
    time: currentState.time,
    instructions: 'Drain your mash and transfer the liquid into your kettle. This is now your wort.',
    phase: 'mash',
  });
  currentState.time += 5;

  if (currentState.volume < recipe.boilSize) {
    const spargeVolume = Math.min(recipe.boilSize - currentState.volume, 4);
    const spargeVolumeString = computeVolumeString(spargeVolume, currentState.isSiUnits);
    const spargeTempString = computeTempString(mash.spargeTemp, currentState.isSiUnits);
    currentState.timeline.push({
      time: currentState.time,
      instructions: `Pour ${spargeVolumeString} of ${spargeTempString} water over your grains. Let that sit for 20 minutes then collect the result and add it to your wort.`,
      phase: 'mash',
    });
    currentState.volume += spargeVolume;
    currentState.time += 20;
  }

  return currentState;
};

/**
 * Computes the amount of water to use in the steeping step
 */
const computeSteepVolume = (steepWeight: number, minTotalLiters: number) => {
  const MAX_STEEP_LITERS_PER_KG = 4;
  const STEEP_LITERS_PER_KG = 2.75;
  const steepVolume = steepWeight * STEEP_LITERS_PER_KG;
  // Check for a really low steep volume and increase it if we can without affecting the output
  if (steepVolume < minTotalLiters) {
    const newSteepVolume = 2;
    if (newSteepVolume / steepWeight < MAX_STEEP_LITERS_PER_KG) {
      return newSteepVolume;
    } else {
      const maxSteepVolume = steepWeight * MAX_STEEP_LITERS_PER_KG;

      return maxSteepVolume;
    }
  }

  return steepVolume;
};

/**
 * Computes the phase in which fermentables are steeped into the wort
 */
const computeSteepPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  if (_.isEmpty(recipe.timelineMap.fermentables.steep)) {
    return currentState;
  }

  let steepWeight = 0;

  _.each(recipe.timelineMap.fermentables.steep, ({ fermentable }) => {
    steepWeight += fermentable.weight;
  });

  const MIN_TOTAL_LITERS = 2;
  const steepVolume = computeSteepVolume(steepWeight, MIN_TOTAL_LITERS);
  const STEEP_TEMP = 68;

  const steepHeatTime = computeTimeToHeat(steepVolume, STEEP_TEMP - currentState.temp);
  currentState.temp = STEEP_TEMP;
  currentState.volume += steepVolume;

  const steepVolumeText = currentState.isSiUnits
    ? `${steepVolume.toFixed(1)}l`
    : `${convert(steepVolume)
        .from('l')
        .to('gal')
        .toFixed(1)}gal`;
  const steepTempText = currentState.isSiUnits
    ? `${STEEP_TEMP}°C`
    : `${convert(STEEP_TEMP)
        .from('C')
        .to('F')
        .toFixed(1)}°F`;

  const smallPotText =
    steepVolume < MIN_TOTAL_LITERS ? ` You may want to use a small, clean, and sanitized pot for steeping.` : '';
  currentState.timeline.push({
    time: currentState.time,
    instructions: `Heat ${steepVolumeText} to ${steepTempText} (about ${Math.round(
      steepHeatTime,
    )} minutes).${smallPotText}`,
    phase: 'steep',
  });
  currentState.time += steepHeatTime;

  const ingredients = createFermentableIngredientList(recipe.timelineMap.fermentables.steep);
  currentState.timeline.push({
    time: currentState.time,
    instructions: `Add ${ingredients.join(', ')} to grain socks`,
    phase: 'steep',
  });

  currentState.timeline.push({
    time: currentState.time,
    instructions: `Add grain socks to heated pot. Steep for ${recipe.steepTime} minutes.`,
    phase: 'steep',
  });
  currentState.time += recipe.steepTime;

  currentState.timeline.push({
    time: currentState.time,
    instructions: `Remove grain socks from pot.`,
    phase: 'steep',
  });

  return currentState;
};

/**
 * Computes the phase in which any necessary water is added before bringing the wort to a boil
 */
const computeTopUpPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  // Adjust temperature based on added water
  const waterChangeRatio = Math.min(1, currentState.volume / recipe.boilSize);
  currentState.temp = currentState.temp * waterChangeRatio + GLOBALS.ROOM_TEMP * (1.0 - waterChangeRatio);

  const boilVolume = computeVolumeString(recipe.boilSize, currentState.isSiUnits);

  // Old: recipe.boilSize - currentState.volume < recipe.boilSize
  // ^ That's equivalent to currentState.volume > 0
  const volumeMissingWater = recipe.boilSize - currentState.volume;
  const volumeMissingWaterString = computeVolumeString(volumeMissingWater, currentState.isSiUnits);
  const addWaterString =
    volumeMissingWater > 0
      ? `Add ${volumeMissingWaterString} of water to your wort so that it reaches ${boilVolume}. `
      : '';
  const action =
    currentState.volume > 0
      ? `${addWaterString}Heat your wort to a rolling boil`
      : `Bring ${boilVolume} to a rolling boil`;

  const boilTime = computeTimeToHeat(recipe.boilSize, 100 - currentState.temp);
  currentState.timeline.push({
    time: currentState.time,
    instructions: `${action} (about ${boilTime} minutes).`,
    phase: 'top-up',
  });
  currentState.time += boilTime;
  currentState.volume = recipe.boilSize;

  return currentState;
};

/**
 * Computes the phase in which the wort is brought to a boil and ingredients are boiled for a certain duration
 */
const computeBoilPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
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

    if (time === 5 && !_.isEmpty(recipe.timelineMap.fermentables.boilEnd)) {
      const boilEndIngredients = createFermentableIngredientList(recipe.timelineMap.fermentables.boilEnd);
      ingredients = _.concat(boilEndIngredients, ingredients);
    }

    currentState.timeline.push({
      time: currentState.time,
      instructions: `Add ${ingredients.join(', ')}`,
      phase: 'boil',
    });
  });

  currentState.time += previousSpiceTime;

  return currentState;
};

/**
 * Computes the phase in which the wort is cooled down to a certain temperature to prepare for yeast
 */
const computeChillPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  const chillTemp = computeTempString(recipe.primaryTemp, currentState.isSiUnits);

  // This is an assumption. The calculation to compute how long it takes to cool a pot of water is pretty complicated
  // and many of the variables will be impossible to know. But we could probably find a way to estimate a little better.
  currentState.timeline.push({
    time: currentState.time,
    instructions: `Flame out. Begin chilling to ${chillTemp} and aerate the cooled wort (about 20 minutes).`,
    phase: 'chill',
  });
  currentState.time += 20;

  return currentState;
};

/**
 * Computes the step in which yeasts are added which will allow the wort to ferment
 */
const computeYeastPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  let yeastNames = _.map(recipe.yeast, 'name');

  if (_.isEmpty(yeastNames) && recipe.primaryDays) {
    // No yeast given, but primary fermentation should happen...
    // Let's just use a generic "yeast" to pitch.
    yeastNames = ['yeast'];
  }

  if (yeastNames.length) {
    currentState.timeline.push({
      time: currentState.time,
      instructions: `Pitch ${_.join(
        yeastNames,
        ', ',
      )} and seal the fermenter. You should see bubbles in the airlock within 24 hours.`,
      phase: 'yeast',
    });
  }

  return currentState;
};

const computeFermentPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  if (!recipe.primaryDays) {
    currentState.timeline.push({
      time: currentState.time,
      instructions: 'This recipe does not have a set time to ferment. This has been automatically changed to 14 days.',
      phase: 'ferment',
    });
    currentState.time += 14 * GLOBALS.MINUTES_PER_DAY;
  }
  currentState.time += recipe.primaryDays * GLOBALS.MINUTES_PER_DAY;

  if (recipe.secondaryDays) {
    currentState.timeline.push({
      time: currentState.time,
      instructions: `Move to secondary fermenter for ${computeDisplayDuration(
        recipe.secondaryDays * GLOBALS.MINUTES_PER_DAY,
        2,
      )}.`,
      phase: 'ferment',
    });
    currentState.time += recipe.secondaryDays * GLOBALS.MINUTES_PER_DAY;
  }

  if (recipe.tertiaryDays) {
    currentState.timeline.push({
      time: currentState.time,
      instructions: `Move to tertiary fermenter for ${computeDisplayDuration(
        recipe.tertiaryDays * GLOBALS.MINUTES_PER_DAY,
        2,
      )}.`,
      phase: 'ferment',
    });
    currentState.time += recipe.tertiaryDays * GLOBALS.MINUTES_PER_DAY;
  }

  return currentState;
};

/**
 * Computes the step in which we add hops directly to the fermented beer
 */
const computeDryHopPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  const times = _.orderBy(Object.keys(recipe.timelineMap.drySpice), _.parseInt, 'desc');

  // Add fermentables that need to be boiled for a certain amount of time.
  let previousSpiceTime = 0;
  _.each(times, unparsedTime => {
    const time = parseInt(unparsedTime);
    const ingredients = createSpiceIngredientList(recipe.timelineMap.drySpice[time]);

    currentState.time += previousSpiceTime - time;

    previousSpiceTime = time;

    currentState.timeline.push({
      time: currentState.time,
      instructions: `Dry Hop ${ingredients.join(', ')}`,
      phase: 'dry hop',
    });
  });

  currentState.time += previousSpiceTime;

  return currentState;
};

const computeKegPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  const kegTemp = computeTempString(recipe.kegTemp, currentState.isSiUnits);
  const keggingSteps = [
    {
      time: currentState.time,
      instructions: 'Depressurize the keg by pulling the release valve for a few seconds.',
      phase: 'keg',
    },
    {
      time: currentState.time,
      instructions: 'Disassemble, clean, and sanitize the keg. Then reassemble.',
      phase: 'keg',
    },
    {
      time: currentState.time,
      instructions: 'Siphon your beer into the keg. Avoid splashing.',
      phase: 'keg',
    },
    {
      time: currentState.time,
      instructions: 'Seal the keg.',
      phase: 'keg',
    },
    {
      time: currentState.time,
      instructions: "Attach the gas line to the CO2 bottle and the keg's in port.",
      phase: 'keg',
    },
    {
      time: currentState.time,
      instructions: 'Open the valves and check for gas leaks by sponging soapy water on all the connection points.',
      phase: 'keg',
    },
    {
      time: currentState.time,
      instructions: 'With the psi low, pull the release valve for a few seconds to displace the oxygen.',
      phase: 'keg',
    },
    {
      time: currentState.time,
      instructions: `Set the psi to ${recipe.kegPressure.toFixed(0)} and store at ${kegTemp} for 7 days.`,
      phase: 'keg',
    },
    {
      time: currentState.time + 7 * GLOBALS.MINUTES_PER_DAY,
      instructions: 'Test the pour and if the beer is still too flat, store for 2 more days.',
      phase: 'keg',
    },
  ];

  currentState.time += 7 * GLOBALS.MINUTES_PER_DAY;
  currentState.timeline = _.concat(currentState.timeline, keggingSteps);

  return currentState;
};

const computeBottlePhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  const numBottles = computeRecipeServings(recipe);
  currentState.timeline.push({
    time: currentState.time,
    instructions: `Prime and bottle about ${numBottles} bottles.`,
    phase: 'bottle',
  });

  return currentState;
};

const computeAgingPhase = (recipe: Readonly<Recipe>, currentState: BrewState) => {
  if (recipe.agingDays) {
    const ageTemp = computeTempString(recipe.agingTemp, currentState.isSiUnits);

    currentState.timeline.push({
      time: currentState.time,
      instructions: `Age at ${ageTemp} for ${recipe.agingDays} days.`,
      phase: 'aging',
    });
    currentState.time += recipe.agingDays * GLOBALS.MINUTES_PER_DAY;
  }

  return currentState;
};

const computeDrinkPhase = (currentState: BrewState) => {
  currentState.timeline.push({
    time: currentState.time,
    instructions: "Relax, don't worry and have a homebrew!",
    phase: 'drink',
  });

  return currentState;
};

const computeStepDurations = (timeline: BrewState['timeline']) =>
  _.map(timeline, (step, index) => ({
    ...step,
    duration: _.get(timeline, `${index + 1}.time`, step.time) - step.time,
  }));

/**
 * Compute a recipe's timeline of instructions. These are done in phases:
 * Mash - Optional - The phase in which malt sugars are released by soaking grains in water
 * Steep - Optional - The phase in which fermentables are steeped into the wort
 * Top-Up - The phase in which any necessary water is added before bringing the wort to a boil
 * Boil - The phase in which the wort is brought to a boil and ingredients are boiled for a certain duration
 * Chill - The phase in which the wort is cooled down to a certain temperature to prepare for yeast
 * Yeast - The step in which yeasts are added which will allow the wort to ferment
 * Ferment - The step in which the beer is allowed to ferment
 * Dry Spice - Optional - The step in which we add hops directly to the fermented beer
 * Bottle - Optional - The phase in which the beer is primed and bottled
 * Aging - Optional - The phase in which we let the bottled beer sit and carbonate
 * Keg - Optional - The phase in which the beer is force-carbonated in a keg
 * Drink - The best and final phase
 */
export const computeRecipeTimeline = (recipe: Readonly<Recipe>, isSiUnits = true, isBottled = true) => {
  let currentState: BrewState = {
    timeline: [],
    time: 0,
    temp: GLOBALS.ROOM_TEMP,
    volume: 0,
    isSiUnits,
  };

  currentState = computeMashPhase(recipe, currentState);

  currentState = computeSteepPhase(recipe, currentState);

  currentState = computeTopUpPhase(recipe, currentState);

  currentState = computeBoilPhase(recipe, currentState);

  currentState = computeChillPhase(recipe, currentState);

  currentState = computeYeastPhase(recipe, currentState);

  currentState = computeFermentPhase(recipe, currentState);

  currentState = computeDryHopPhase(recipe, currentState);

  if (isBottled) {
    currentState = computeBottlePhase(recipe, currentState);

    currentState = computeAgingPhase(recipe, currentState);
  } else {
    currentState = computeKegPhase(recipe, currentState);
  }

  currentState = computeDrinkPhase(currentState);

  const finalizedTimeline = computeStepDurations(currentState.timeline);

  return finalizedTimeline;
};
