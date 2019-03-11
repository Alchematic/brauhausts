import convert from 'convert-units';
import * as _ from 'lodash';
import { computeFermentableGU, computeFermentablePrice, computeFermentableUse, Fermentable } from './fermentable';
import { GLOBALS } from './globals';
import { Mash } from './mash';
import { TimelineMap } from './recipe-timeline';
import { computeIsDrySpice, computeSpiceBitterness, computeSpicePrice, Spice } from './spice';
import { Style } from './style';
import { convertSpecificGravityToPlato, lowerCaseIncludes } from './utils';
import { computeYeastPrice, Yeast } from './yeast';
export { importBeerXML } from './import-beerxml';

export enum RecipeType {
  EXTRACT = 'Extract',
  PARTIAL_MASH = 'Partial Mash',
  ALL_GRAIN = 'All Grain',
}

export const RecipeTypeMap = {
  Extract: RecipeType.EXTRACT,
  'Partial Mash': RecipeType.PARTIAL_MASH,
  'All Grain': RecipeType.ALL_GRAIN,
};

/**
 * A beer recipe, consisting of various ingredients and metadata which
 * provides a calculate() method to calculate OG, FG, IBU, ABV, and a
 * timeline of instructions for brewing the recipe.
 */
export type Recipe = {
  name: string;
  description: string;
  type: RecipeType;
  author: string;
  notes: string;
  boilSize: number;
  batchSize: number;
  servingSize: number;

  steepEfficiency: number;
  steepTime: number;
  mashEfficiency: number;

  style: Style;
  ibuMethod: 'tinseth' | 'rager';

  fermentables: Fermentable[];
  spices: Spice[];
  yeast: Yeast[];

  mash: Mash;

  og: number;
  est_og: number;
  fg: number;
  est_fg: number;
  color: number;
  est_color: number;
  ibu: number;
  abv: number;
  est_abv: number;
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

  kegTemp: number;
  kegPressure: number;

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

  timelineMap?: TimelineMap; // A mapping of values used to build a recipe timeline / instructions
};

export const createRecipe = (overrideRecipe?: Partial<Recipe>): Recipe => {
  const newRecipe: Recipe = {
    name: 'New Recipe',
    description: 'Recipe description',
    type: RecipeType.EXTRACT,
    author: 'Anonymous Brewer',
    notes: '',
    boilSize: 10.0,
    batchSize: 20.0,
    servingSize: 0.355,
    steepEfficiency: 50,
    steepTime: 20,
    mashEfficiency: 75,
    style: {
      name: '',
      category: '',
      og: [1.0, 1.15],
      fg: [1.0, 1.15],
      ibu: [0, 150],
      color: [0, 500],
      abv: [0, 14],
      carb: [1.0, 4.0],
    },
    ibuMethod: 'tinseth',
    fermentables: [],
    spices: [],
    yeast: [],
    mash: null,
    og: 0.0,
    est_og: 0.0,
    fg: 0.0,
    est_fg: 0.0,
    color: 0.0,
    est_color: 0.0,
    ibu: 0.0,
    abv: 0.0,
    est_abv: 0.0,
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
    kegTemp: 0.0,
    kegPressure: 0.0,
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
    agingTemp: 20.0,
  };

  return _.defaultsDeep(overrideRecipe, newRecipe);
};

export const addToRecipe = (recipe: Recipe, type: 'fermentable' | 'spice' | 'hop' | 'yeast', values: any) => {
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

export const computeGrainWeight = (fermentables: Fermentable[]) => {
  const grainFermentables = _.filter(fermentables, fermentable => lowerCaseIncludes(fermentable.type, 'grain'));

  return _.sumBy(grainFermentables, 'weight') || 0;
};

const computeCarbVolume = (recipe: Recipe) => {
  if (/stout|porter/i.test(recipe.name)) {
    return 1.85;
  }

  if (/lambic|wheat/i.test(recipe.name)) {
    return 3.3;
  }

  return 2.5;
};

export const calculateRecipe = (oldRecipe: Recipe) => {
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
    fermentables: { mash: [], steep: [], boil: [], boilEnd: [] },
    times: {},
    drySpice: {},
    yeast: [],
  };

  // Calculate gravities and color from fermentables
  _.each(recipe.fermentables, fermentable => {
    let efficiency = 1.0;
    if (computeFermentableUse(fermentable) === 'steep') {
      efficiency = recipe.steepEfficiency / 100.0;
    } else if (computeFermentableUse(fermentable) === 'mash') {
      efficiency = recipe.mashEfficiency / 100.0;
    }

    mcu +=
      (fermentable.color *
        convert(fermentable.weight)
          .from('kg')
          .to('lb')) /
      convert(recipe.batchSize)
        .from('l')
        .to('gal');

    // Update gravities
    const gu = computeFermentableGU(fermentable, recipe.batchSize) * efficiency;
    const gravity = gu / 1000.0;
    recipe.og += gravity;

    if (!fermentable.late) {
      earlyOg += (computeFermentableGU(fermentable, recipe.boilSize) * efficiency) / 1000.0;
    }

    // Update recipe price with fermentable
    recipe.price += computeFermentablePrice(fermentable);

    // Add fermentable info into the timeline map
    const fermentableUse = computeFermentableUse(fermentable, recipe.type);
    const timelineMapFermentable = {
      fermentable,
      gravity: gu,
    };
    recipe.timelineMap.fermentables[fermentableUse] = _.concat(
      recipe.timelineMap.fermentables[fermentableUse],
      timelineMapFermentable,
    );
  });

  recipe.color = 1.4922 * Math.pow(mcu, 0.6859);

  // Get attenuation for final gravity
  _.each(recipe.yeast, yeast => {
    if (yeast.attenuation > attenuation) {
      attenuation = yeast.attenuation;
    }

    // Update recipe price with yeast
    recipe.price += computeYeastPrice(yeast);

    // Add yeast info into the timeline map
    recipe.timelineMap.yeast.push(yeast);
  });

  // Update final gravity based on original gravity and maximum
  // attenuation from yeast.
  recipe.fg = recipe.og - ((recipe.og - 1.0) * attenuation) / 100.0;

  // Update alcohol by volume based on original and final gravity
  recipe.abv = ((1.05 * (recipe.og - recipe.fg)) / recipe.fg / 0.79) * 100.0;

  // Gravity degrees plato approximations
  recipe.ogPlato = convertSpecificGravityToPlato(recipe.og);
  recipe.fgPlato = convertSpecificGravityToPlato(recipe.fg);

  // Update calories
  recipe.realExtract = 0.1808 * recipe.ogPlato + 0.8192 * recipe.fgPlato;
  recipe.abw = (0.79 * recipe.abv) / recipe.fg;
  recipe.calories = Math.max(
    0,
    (6.9 * recipe.abw + 4.0 * (recipe.realExtract - 0.1)) * recipe.fg * recipe.servingSize * 10,
  );

  const carbVolume = recipe.bottlingPressure || computeCarbVolume(recipe);

  recipe.kegTemp = recipe.bottlingTemp || GLOBALS.REFRIGERATOR_TEMP;
  const kegTempF = convert(recipe.kegTemp)
    .from('C')
    .to('F');

  // Using brewcalc's kegPressure calculation: https://github.com/brewcomputer/brewcalc/blob/master/lib/brewcalc.js
  recipe.kegPressure = Math.max(
    0,
    -16.6999 -
      0.0101059 * kegTempF +
      0.00116512 * kegTempF * kegTempF +
      0.173354 * kegTempF * carbVolume +
      4.24267 * carbVolume -
      0.0684226 * carbVolume * carbVolume,
  );

  const bottlingTempF = convert(recipe.bottlingTemp || GLOBALS.ROOM_TEMP)
    .from('C')
    .to('F');
  recipe.primingCornSugar =
    0.015195 * 5 * (carbVolume - 3.0378 + 0.050062 * bottlingTempF - 0.00026555 * bottlingTempF * bottlingTempF);
  recipe.primingSugar = recipe.primingCornSugar * 0.90995;
  recipe.primingHoney = recipe.primingCornSugar * 1.22496;
  recipe.primingDme = recipe.primingCornSugar * 1.33249;

  // Calculate bitterness
  _.each(recipe.spices, spice => {
    const bitterness = 0.0;
    const time: number = spice.time;

    const isBoilSpice = spice.use.toLowerCase() === 'boil';
    const isMashSpice = spice.use.toLowerCase() === 'mash';
    const isDrySpice = computeIsDrySpice(spice);

    if (isMashSpice) {
      const spiceFermentable: Fermentable = {
        type: 'Grain',
        name: spice.name,
        weight: spice.weight,
        color: null,
        yield: null,
      };
      recipe.timelineMap.fermentables.mash.push({
        fermentable: spiceFermentable,
        gravity: 0,
      });
    }

    if (spice.aa && isBoilSpice) {
      recipe.ibu += computeSpiceBitterness(spice, recipe.ibuMethod, earlyOg, recipe.batchSize);
    }

    // Update recipe price with spice
    recipe.price += computeSpicePrice(spice);

    // Update timeline map with hop information
    if (isDrySpice) {
      recipe.timelineMap.drySpice[time] = recipe.timelineMap.drySpice[time] || [];
      recipe.timelineMap.drySpice[time].push({
        spice,
        bitterness,
      });
    } else if (isBoilSpice) {
      recipe.timelineMap.times[time] = recipe.timelineMap.times[time] || [];
      recipe.timelineMap.times[time].push({
        spice,
        bitterness,
      });
    }
  });

  // Calculate bitterness to gravity ratios
  recipe.buToGu = recipe.ibu / (recipe.og - 1.0) / 1000.0;

  // http://klugscheisserbrauerei.wordpress.com/beer-balance/
  const rte = (0.82 * (recipe.fg - 1.0) + 0.18 * (recipe.og - 1.0)) * 1000.0;
  recipe.bv = (0.8 * recipe.ibu) / rte;

  return recipe;
};
