import convert from 'convert-units';
import * as _ from 'lodash';
import { GLOBALS } from './globals';
import { computeDisplayDuration, computeTimeToHeat } from './utils';

/**
 * A beer recipe, consisting of various ingredients and metadata which
 * provides a calculate() method to calculate OG, FG, IBU, ABV, and a
 * timeline of instructions for brewing the recipe.
 */
type RecipeType = {
  name: string;
  description: string;
  author: string;
  boilSize: number;
  batchSize: number;
  servingSize: number;

  steepEfficiency: number;
  steepTime: number;
  mashEfficiency: number;

  style: any; // Need a Style Type
  ibuMethod: 'tinseth' | 'rager';

  fermentables: any[]; // Fermentable[];
  spices: any[]; // Spice[];
  yeast: any[]; // Yeast[];

  mash: any; // Mash;

  og: number;
  fg: number;
  color: number;
  ibu: number;
  abv: number;
  price: number;

  buToGu: number; // Bitterness to gravity ratio
  bv: number; // Balance value (http://klugscheisserbrauerei.wordpress.com/beer-balance/)

  ogPlato: number;
  fgPlato: number;
  abw: number;
  realExtract: number;
  calories: number;

  bottlingTemp: number;
  bottlingPressure: number;

  primingCornSugar: number;
  primingSugar: number;
  primingHoney: number;
  primingDme: number;

  primaryDays: number;
  primaryTemp: number;
  secondaryDays: number;
  secondaryTemp: number;
  tertiaryDays: number;
  tertiaryTemp: number;
  agingDays: number;
  agingTemp: number;

  brewDayDuration?: any;
  boilStartTime?: any;
  boilEndTime?: any;

  timelineMap?: ITimelineMap; // A mapping of values used to build a recipe timeline / instructions
};

export const createRecipe = (): RecipeType => ({
  name: 'New Recipe',
  description: 'Recipe description',
  author: 'Anonymous Brewer',
  boilSize: 10.0,
  batchSize: 20.0,
  servingSize: 0.355,
  steepEfficiency: 50,
  steepTime: 20,
  mashEfficiency: 75,

  style: null,

  ibuMethod: 'tinseth',

  fermentables: [],
  spices: [],
  yeast: [],

  mash: null,

  og: 0.0,
  fg: 0.0,
  color: 0.0,
  ibu: 0.0,
  abv: 0.0,
  price: 0.0,

  buToGu: 0.0,
  bv: 0.0,

  ogPlato: 0.0,
  fgPlato: 0.0,
  abw: 0.0,
  realExtract: 0.0,
  calories: 0.0,

  bottlingTemp: 0.0,
  bottlingPressure: 0.0,

  primingCornSugar: 0.0,
  primingSugar: 0.0,
  primingHoney: 0.0,
  primingDme: 0.0,

  primaryDays: 14.0,
  primaryTemp: 20.0,
  secondaryDays: 0.0,
  secondaryTemp: 0.0,
  tertiaryDays: 0.0,
  tertiaryTemp: 0.0,
  agingDays: 14,
  agingTemp: 20.0
});

/**
 * Export a recipe to JSON, which stores all values which are not
 * easily computed via Recipe.prototype.calculate(). This method
 * gets called when using JSON.stringify(recipe).
 */
export const recipeToJson = (recipe: RecipeType) =>
  JSON.stringify(
    _.pick(recipe, [
      'id',
      'name',
      'description',
      'author',
      'boilSize',
      'batchSize',
      'servingSize',
      'steepEfficiency',
      'steepTime',
      'mashEfficiency',
      'style',
      'ibuMethod',
      'fermentables',
      'spices',
      'yeast',
      'mash',
      'bottlingTemp',
      'bottlingPressure',
      'primaryDays',
      'primaryTemp',
      'secondaryDays',
      'secondaryTemp',
      'tertiaryDays',
      'tertiaryTemp',
      'agingDays',
      'agingTemp'
    ]),
    null,
    2
  );

export const addToRecipe = (
  recipe: RecipeType,
  type: 'fermentable' | 'spice' | 'hop' | 'yeast',
  values: any
) => {
  const newRecipe = _.cloneDeep(recipe);
  switch (type) {
    case 'fermentable':
      newRecipe.fermentables.push(values);
      break;
    case 'spice':
    case 'hop':
      newRecipe.spices.push(values);
      break;
    case 'yeast':
      newRecipe.yeast.push(values);
      break;
  }

  return newRecipe;
};

const computeRecipeGrainWeight = (recipe: RecipeType) => {
  const grainFermentables = _.filter(recipe.fermentables, {
    type: 'grain'
  } as any);

  return _.sumBy(grainFermentables, 'weight');
};

const computeBottleCount = (recipe: RecipeType) =>
  Math.floor(recipe.batchSize / recipe.servingSize);

// TODO: Clean this up. Didn't touch any of the logic
/** Scale this recipe, keeping gravity and bitterness the same */
export const scaleRecipe = (
  recipe: RecipeType,
  newBatchSize: number,
  newBoilSize: number
) => {
  const newRecipe = _.cloneDeep(recipe);
  let earlyOg = 1.0;
  let newEarlyOg = 1.0;

  for (let i = 0; i < newRecipe.fermentables.length; i++) {
    const fermentable = newRecipe.fermentables[i];

    // Store early gravity for bitterness calculations
    let efficiency = 1.0;
    if (fermentable.addition() === 'steep') {
      efficiency = newRecipe.steepEfficiency / 100.0;
    } else if (fermentable.addition() === 'mash') {
      efficiency = newRecipe.mashEfficiency / 100.0;
    }

    if (!fermentable.late) {
      earlyOg += (fermentable.gu(newRecipe.boilSize) * efficiency) / 1000.0;
    }

    // Adjust fermentable weight
    fermentable.weight *= newBatchSize / newRecipe.batchSize;

    if (!fermentable.late) {
      newEarlyOg += (fermentable.gu(newBoilSize) * efficiency) / 1000.0;
    }
  }

  for (let i = 0; i < newRecipe.spices.length; i++) {
    const spice = newRecipe.spices[i];

    if (spice.aa && spice.time) {
      const bitterness = spice.bitterness(
        newRecipe.ibuMethod,
        earlyOg,
        newRecipe.batchSize
      );

      if (newRecipe.ibuMethod === 'tinseth') {
        spice.weight =
          (bitterness * newBatchSize) /
          (1.65 *
            Math.pow(0.000125, newEarlyOg - 1.0) *
            ((1 - Math.pow(2.718, -0.04 * spice.time)) / 4.15) *
            ((spice.aa / 100) * 1000000) *
            spice.utilizationFactor());
      } else if (newRecipe.ibuMethod === 'rager') {
        const utilization =
          18.11 + 13.86 * Math.tanh((spice.time - 31.32) / 18.27);
        const adjustment = Math.max(0, (newEarlyOg - 1.05) / 0.2);
        spice.weight =
          bitterness /
          ((100 * utilization * spice.utilizationFactor() * spice.aa) /
            (newBatchSize * (1 + adjustment)));
      }
    } else {
      // Scale linearly, no bitterness
      spice.weight *= newBatchSize / newRecipe.batchSize;
    }
  }

  newRecipe.batchSize = newBatchSize;
  newRecipe.boilSize = newBoilSize;

  return newRecipe;
};

export const calculateRecipe = (oldRecipe: RecipeType) => {
  const recipe = _.cloneDeep(oldRecipe);
  recipe.og = 1.0;
  recipe.fg = 0.0;
  recipe.ibu = 0.0;
  recipe.price = 0.0;

  let earlyOg = 1.0;
  let mcu = 0.0;
  let attenuation = 0.0;

  // A map of various ingredient values used to generate the timeline
  // steps below.
  recipe.timelineMap = {
    fermentables: {
      mash: [],
      steep: [],
      boil: [],
      boilEnd: []
    },
    times: {},
    drySpice: {},
    yeast: []
  };

  // Calculate gravities and color from fermentables
  recipe.fermentables.forEach(fermentable => {
    let efficiency = 1.0;
    if (fermentable.addition === 'steep') {
      efficiency = recipe.steepEfficiency / 100.0;
    } else if (fermentable.addition === 'mash') {
      efficiency = recipe.mashEfficiency / 100.0;
    }

    mcu +=
      (fermentable.color * fermentable.weightLb) /
      convert(recipe.batchSize)
        .from('l')
        .to('gal');

    // Update gravities
    const gu = fermentable.gu(recipe.batchSize) * efficiency;
    const gravity = gu / 1000.0;
    recipe.og += gravity;

    if (!fermentable.late) {
      earlyOg += (fermentable.gu(recipe.boilSize) * efficiency) / 1000.0;
    }

    // Update recipe price with fermentable
    recipe.price += fermentable.price;

    // Add fermentable info into the timeline map
    if (fermentable.addition === 'boil') {
      if (!fermentable.late) {
        recipe.timelineMap.fermentables.boil.push([fermentable, gu]);
      } else {
        recipe.timelineMap.fermentables.boilEnd.push([fermentable, gu]);
      }
    } else if (fermentable.addition === 'steep') {
      recipe.timelineMap.fermentables.steep.push([fermentable, gu]);
    } else if (fermentable.addition === 'mash') {
      recipe.timelineMap.fermentables.mash.push({
        fermentable: fermentable,
        gravity: gu
      });
    }
  });

  recipe.color = 1.4922 * Math.pow(mcu, 0.6859);

  // Get attenuation for final gravity
  _.each(recipe.yeast, yeast => {
    if (yeast.attenuation > attenuation) {
      attenuation = yeast.attenuation;
    }

    // Update recipe price with yeast
    recipe.price += yeast.price();

    // Add yeast info into the timeline map
    recipe.timelineMap.yeast.push(yeast);
  });

  // Update final gravity based on original gravity and maximum
  // attenuation from yeast.
  recipe.fg = recipe.og - ((recipe.og - 1.0) * attenuation) / 100.0;

  // Update alcohol by volume based on original and final gravity
  recipe.abv = ((1.05 * (recipe.og - recipe.fg)) / recipe.fg / 0.79) * 100.0;

  // Gravity degrees plato approximations
  recipe.ogPlato =
    -463.37 + 668.72 * recipe.og - 205.35 * (recipe.og * recipe.og);
  recipe.fgPlato =
    -463.37 + 668.72 * recipe.fg - 205.35 * (recipe.fg * recipe.fg);

  // Update calories
  recipe.realExtract = 0.1808 * recipe.ogPlato + 0.8192 * recipe.fgPlato;
  recipe.abw = (0.79 * recipe.abv) / recipe.fg;
  recipe.calories = Math.max(
    0,
    (6.9 * recipe.abw + 4.0 * (recipe.realExtract - 0.1)) *
      recipe.fg *
      recipe.servingSize *
      10
  );

  // Calculate bottle / keg priming amounts
  const v = recipe.bottlingPressure || 2.5;
  const t = convert(recipe.bottlingTemp || GLOBALS.ROOM_TEMP)
    .from('C')
    .to('F');
  recipe.primingCornSugar =
    0.015195 * 5 * (v - 3.0378 + 0.050062 * t - 0.00026555 * t * t);
  recipe.primingSugar = recipe.primingCornSugar * 0.90995;
  recipe.primingHoney = recipe.primingCornSugar * 1.22496;
  recipe.primingDme = recipe.primingCornSugar * 1.33249;

  // Calculate bitterness
  for (let i = 0; i < recipe.spices.length; i++) {
    const spice = recipe.spices[i];
    const bitterness = 0.0;
    const time: number = spice.time;

    if (spice.aa && spice.use.toLowerCase() === 'boil') {
      recipe.ibu += spice.bitterness(
        recipe.ibuMethod,
        earlyOg,
        recipe.batchSize
      );
    }

    // Update recipe price with spice
    recipe.price += spice.price();

    // Update timeline map with hop information
    if (spice.dry()) {
      recipe.timelineMap['drySpice'][time] =
        recipe.timelineMap['drySpice'][time] || [];
      recipe.timelineMap.drySpice[time].push([spice, bitterness]);
    } else {
      recipe.timelineMap.times[time] = recipe.timelineMap.times[time] || [];
      recipe.timelineMap.times[time].push({
        spice: spice,
        bitterness: bitterness
      });
    }
  }

  // Calculate bitterness to gravity ratios
  recipe.buToGu = recipe.ibu / (recipe.og - 1.0) / 1000.0;

  // http://klugscheisserbrauerei.wordpress.com/beer-balance/
  const rte = (0.82 * (recipe.fg - 1.0) + 0.18 * (recipe.og - 1.0)) * 1000.0;
  recipe.bv = (0.8 * recipe.ibu) / rte;

  return recipe;
};

const convertKgToLbOz = (kgs: number) => {
  const lbs = Math.floor(
    convert(kgs)
      .from('kg')
      .to('lb')
  );
  const oz = Math.round(
    convert(kgs)
      .from('kg')
      .to('oz') % 16
  );

  return `${lbs > 0 ? `${lbs}lb` : ''} ${oz}oz`;
};

export const computeRecipeTimeline = (
  oldRecipe: RecipeType,
  siUnits = true
) => {
  const recipe = _.cloneDeep(oldRecipe);
  const timeline = [];

  let boilName = 'water';
  let totalTime = 0;
  let currentTemp = GLOBALS.ROOM_TEMP;
  let liquidVolume = 0;

  // Get a list of fermentable descriptions taking siUnits into account
  const fermentableList = (items: ITimelineFermentable[]) => {
    const ingredients = [];
    let weight = '';

    for (let i = 0; i < items.length; i++) {
      const fermentable = items[i].fermentable;
      const gravity = items[i].gravity;

      if (siUnits) {
        weight = `${fermentable.weight.toFixed(2)}kg`;
      } else {
        weight = convertKgToLbOz(fermentable.weight);
      }

      ingredients.push(
        `${weight} of ${fermentable.name} (${gravity.toFixed(1)} GU)`
      );
    }

    return ingredients;
  };

  // Get a list of spice descriptions taking siUnits into account
  const spiceList = (items: ITimelineSpice[]) => {
    const ingredients = [];
    let weight = '';

    for (let i = 0; i < items.length; i++) {
      const spice = items[i].spice;
      const bitterness = items[i].bitterness;

      if (siUnits) {
        weight = `${spice.weight * 1000}g`;
      } else {
        weight = convertKgToLbOz(spice.weight);
      }

      let extra = '';
      if (bitterness) {
        extra = ` (${bitterness.toFixed(1)} IBU)`;
      }

      ingredients.push(`${weight} of ${spice.name}${extra}`);
    }

    return ingredients;
  };

  if (_.size(recipe.timelineMap.fermentables.mash) > 0) {
    boilName = 'wort';

    let mash = recipe.mash;
    mash = mash || {}; // TODO: {} was new Mash();

    const ingredients = fermentableList(recipe.timelineMap.fermentables.mash);
    timeline.push([
      totalTime,
      `Begin ${mash.name} mash. Add ${ingredients.join(', ')}.`
    ]);

    const steps = recipe.mash.steps || [
      // Default to a basic 60 minute single-infusion mash at 68C
      {
        name: 'Saccharification',
        type: MashStepType.Infusion,
        time: 60,
        rampTime: computeTimeToHeat(
          computeRecipeGrainWeight(recipe),
          68 - currentTemp
        ),
        temp: 68,
        waterRatio: 2.75
      }
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const strikeVolume =
        step.waterRatio * computeRecipeGrainWeight(recipe) - liquidVolume;
      let strikeVolumeDesc = '';
      let strikeTempDesc = '';

      if (step.temp !== currentTemp && strikeVolume > 0) {
        // We are adding hot or cold water!
        const strikeTemp =
          ((step.temp - currentTemp) *
            (0.4184 * computeRecipeGrainWeight(recipe))) /
            strikeVolume +
          step.temp;
        const timeToHeat = computeTimeToHeat(
          strikeVolume,
          strikeTemp - currentTemp
        );

        if (siUnits) {
          strikeVolumeDesc = `${strikeVolume.toFixed(1)}l`;
          strikeTempDesc = `${Math.round(strikeTemp)}°C`;
        } else {
          strikeVolumeDesc = `${convert(strikeVolume)
            .from('l')
            .to('qt')}qts`;
          strikeTempDesc = `${Math.round(
            convert(strikeTemp)
              .from('C')
              .to('F')
          )}°F`;
        }

        timeline.push([
          totalTime,
          `Heat ${strikeVolumeDesc} to ${strikeTempDesc} (about ${Math.round(
            timeToHeat
          )} minutes)`
        ]);
        liquidVolume += strikeVolume;
        totalTime += timeToHeat;
      } else if (step.temp !== currentTemp) {
        let heatTemp = '';
        const timeToHeat = computeTimeToHeat(
          liquidVolume,
          step.temp - currentTemp
        );

        if (siUnits) {
          heatTemp = `${Math.round(step.temp)}°C`;
        } else {
          heatTemp = `${Math.round(
            convert(step.temp)
              .from('C')
              .to('F')
          )}°F`;
        }

        timeline.push([
          totalTime,
          `Heat the mash to ${heatTemp} (about ${Math.round(
            timeToHeat
          )} minutes)`
        ]);
        totalTime += timeToHeat;
      }
      timeline.push([
        totalTime,
        `${step.name}: ${step.description(
          siUnits,
          computeRecipeGrainWeight(recipe)
        )}.`
      ]);
      totalTime += step.time;
      currentTemp = step.temp - (step.time * GLOBALS.MASH_HEAT_LOSS) / 60.0;
    }

    timeline.push([
      totalTime,
      'Remove grains from mash. This is now your wort.'
    ]);
    totalTime += 5;
  }

  if (recipe.timelineMap.fermentables.steep.length) {
    boilName = 'wort';
    let steepWeight = 0;
    let steepVolume = '';
    let steepTemp = '';

    for (let i = 0; i < recipe.timelineMap.fermentables.steep.length; i++) {
      const fermentable = recipe.timelineMap.fermentables.steep[i].fermentable;
      steepWeight += fermentable.weight;
    }

    const steepHeatTime = computeTimeToHeat(
      steepWeight * 2.75,
      68 - currentTemp
    );
    currentTemp = 68;
    liquidVolume += steepWeight * 2.75;

    if (siUnits) {
      steepVolume = `${(steepWeight * 2.75).toFixed(1)}l`;
      steepTemp = `${68}°C`;
    } else {
      steepVolume = `${convert(steepWeight * 2.75)
        .from('l')
        .to('gal')
        .toFixed(1)}gal`;
      steepTemp = `${convert(68)
        .from('C')
        .to('F')
        .toFixed(1)}°F`;
    }

    timeline.push([
      totalTime,
      `Heat ${steepVolume} to ${steepTemp} (about ${Math.round(
        steepHeatTime
      )} minutes)`
    ]);
    totalTime += steepHeatTime;

    const ingredients = fermentableList(recipe.timelineMap.fermentables.steep);
    timeline.push([
      totalTime,
      `Add ${ingredients.join(', ')} and steep for ${recipe.steepTime} minutes.`
    ]);
    totalTime += 20;
  }

  // Adjust temperature based on added water
  const waterChangeRatio = Math.min(1, liquidVolume / recipe.boilSize);
  currentTemp =
    currentTemp * waterChangeRatio +
    GLOBALS.ROOM_TEMP * (1.0 - waterChangeRatio);

  let boilVolume = '';
  if (siUnits) {
    boilVolume = `${recipe.boilSize.toFixed(1)}l`;
  } else {
    boilVolume = `${convert(recipe.boilSize)
      .from('l')
      .to('gal')
      .toFixed(1)}gal`;
  }

  let action = '';
  if (recipe.boilSize - liquidVolume < recipe.boilSize) {
    action = `Top up the ${boilName} to ${boilVolume} and heat to a rolling boil`;
  } else {
    action = `Bring ${boilVolume} to a rolling boil`;
  }

  const boilTime = computeTimeToHeat(recipe.boilSize, 100 - currentTemp);
  timeline.push([totalTime, `${action} (about ${boilTime} minutes).`]);
  totalTime += boilTime;

  recipe.boilStartTime = totalTime;

  const times = Object.keys(recipe.timelineMap.times);

  // If we have late additions and no late addition time, add it
  if (
    recipe.timelineMap.fermentables.boilEnd.length &&
    times.indexOf('5') === -1
  ) {
    recipe.timelineMap.times[5] = [];
    times.push('5');
  }

  let previousSpiceTime = 0;
  // Sort times by descending here
  const spiceCounter = 0;
  for (let i = 0; i < times.length; i++) {
    const time = parseInt(times[i]);
    let ingredients = spiceList(recipe.timelineMap.times[time]);

    if (spiceCounter === 0) {
      ingredients = fermentableList(
        recipe.timelineMap.fermentables.boil
      ).concat(ingredients);
      previousSpiceTime = time;
    }

    totalTime += previousSpiceTime - time;

    previousSpiceTime = time;

    if (time === 5 && recipe.timelineMap.fermentables.boilEnd.length) {
      ingredients = fermentableList(
        recipe.timelineMap.fermentables.boilEnd
      ).concat(ingredients);
    }

    timeline.push([totalTime, `Add ${ingredients.join(', ')}`]);
  }

  totalTime += previousSpiceTime;

  // EDITING ENDS HERE

  recipe.boilEndTime = totalTime;

  let chillTemp = '';
  if (siUnits) {
    chillTemp = `${recipe.primaryTemp}°C`;
  } else {
    chillTemp = `${convert(recipe.primaryTemp)
      .from('C')
      .to('F')}°F`;
  }

  timeline.push([
    totalTime,
    `Flame out. Begin chilling to ${chillTemp} and aerate the cooled wort (about 20 minutes).`
  ]);
  totalTime += 20;

  let yeasts = recipe.yeast.map(x => x.name);

  if (!yeasts.length && recipe.primaryDays) {
    // No yeast given, but primary fermentation should happen...
    // Let's just use a generic "yeast" to pitch.
    yeasts = ['yeast'];
  }

  if (yeasts.length) {
    timeline.push([
      totalTime,
      `Pitch ${yeasts.join(
        ', '
      )} and seal the fermenter. You should see bubbles in the airlock within 24 hours.`
    ]);
  }

  // The brew day is over! Fermenting starts now.
  recipe.brewDayDuration = totalTime;

  if (!recipe.primaryDays && !recipe.secondaryDays && !recipe.tertiaryDays) {
    timeline.push([
      totalTime,
      `Drink immediately (about ${computeBottleCount(recipe)} bottles).`
    ]);

    return timeline;
  }

  totalTime += recipe.primaryDays * 1440;

  if (recipe.secondaryDays) {
    timeline.push([
      totalTime,
      `Move to secondary fermenter for ${computeDisplayDuration(
        recipe.secondaryDays * 1440,
        2
      )}.`
    ]);
    totalTime += recipe.secondaryDays * 1440;
  }
  if (recipe.tertiaryDays) {
    timeline.push([
      totalTime,
      `Move to tertiary fermenter for ${computeDisplayDuration(
        recipe.tertiaryDays * 1440,
        2
      )}.`
    ]);
    totalTime += recipe.tertiaryDays * 1440;
  }
  let primeMsg = `Prime and bottle about ${computeBottleCount(
    recipe
  )} bottles.`;

  if (recipe.agingDays) {
    let ageTemp = '';
    if (siUnits) {
      ageTemp = `${recipe.agingTemp}C`;
    } else {
      ageTemp = `${convert(recipe.agingTemp)
        .from('C')
        .to('F')}F`;
    }

    primeMsg += ` Age at ${ageTemp} for ${recipe.agingDays} days.`;
  }
  timeline.push([totalTime, primeMsg]);
  totalTime += recipe.agingDays * 1440;

  timeline.push([totalTime, "Relax, don't worry and have a homebrew!"]);

  return timeline;
};

interface ITimelineMap {
  fermentables: ITimelineFermentables;
  times: { [key: number]: ITimelineSpice[] };
  drySpice: any;
  yeast: any[];
}

interface ITimelineFermentables {
  mash: ITimelineFermentable[];
  steep: any;
  boil: any;
  boilEnd: any;
}

interface ITimelineFermentable {
  fermentable: any;
  gravity: number;
}

interface ITimelineSpice {
  spice: any;
  bitterness: number;
}

enum MashStepType {
  Infusion = 'Infusion'
}
