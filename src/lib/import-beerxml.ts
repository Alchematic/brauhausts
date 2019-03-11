import * as _ from 'lodash';
import { createDefaultFermentable, Fermentable } from './fermentable';
import { createDefaultMash, createDefaultMashStep } from './mash';
import { computeGrainWeight, createRecipe, Recipe, RecipeTypeMap } from './recipe';
import { createDefaultSpice, Spice } from './spice';
import { Style } from './style';
import { lowerKeysDeep, parseXML, pickAndParseFloat } from './utils';
import { createDefaultYeast, Yeast } from './yeast';

/**
 * In beerXML a fermentable may be stored as recipe.fermentable or as recipe.fermentables.fermentable.
 * The same is true with most things that there may be multiple of. This function allows checking for
 * either case and returning the result as an array.
 */
const findPluralOrSingularAsArray = (recipe: any, pluralForm: string, singularForm: string) => {
  const result = _.get(recipe, `${pluralForm}.${singularForm}`, _.get(recipe, `${singularForm}`, []));

  return _.isObject(result) && !_.isArray(result) ? [result] : _.toArray(result);
};

const computeImportFermentables = (xmlFermentables: any[]): Fermentable[] =>
  _.map(xmlFermentables, fermentable => {
    const newFermentable = _.defaults(
      {
        name: fermentable.name,
        weight: parseFloat(fermentable.amount) || undefined,
        yield: parseFloat(fermentable.yield) || undefined,
        color: parseFloat(fermentable.color) || undefined,
        late: fermentable.add_after_boil === 'true',
        type: fermentable.type,
      },
      createDefaultFermentable(),
    );

    return newFermentable;
  });

const computeImportStyle = (xmlRecipe: any): Style => ({
  ..._.pick(xmlRecipe.style, 'name', 'category'),
  og: [parseFloat(xmlRecipe.style.og_min) || undefined, parseFloat(xmlRecipe.style.og_max) || undefined],
  fg: [parseFloat(xmlRecipe.style.fg_min) || undefined, parseFloat(xmlRecipe.style.fg_max) || undefined],
  ibu: [parseFloat(xmlRecipe.style.ibu_min) || undefined, parseFloat(xmlRecipe.style.ibu_max) || undefined],
  color: [parseFloat(xmlRecipe.style.color_min) || undefined, parseFloat(xmlRecipe.style.color_max) || undefined],
  abv: [parseFloat(xmlRecipe.style.abv_min) || undefined, parseFloat(xmlRecipe.style.abv_max) || undefined],
  carb: [parseFloat(xmlRecipe.style.carb_min) || undefined, parseFloat(xmlRecipe.style.carb_max) || undefined],
});

const computeImportSpices = (xmlSpices: any[]): Spice[] =>
  _.map(xmlSpices, spice => {
    const newSpice = _.defaults(
      {
        ..._.pick(spice, 'name', 'use', 'form', 'time'),
        weight: parseFloat(spice.amount) || undefined,
        aa: parseFloat(spice.alpha) || undefined,
      },
      createDefaultSpice(),
    );

    return newSpice;
  });

const computeImportYeast = (xmlYeasts: any[]): Yeast[] =>
  _.map(xmlYeasts, yeast => {
    const newYeast = _.defaults(
      {
        ..._.pick(yeast, 'name', 'type', 'form'),
        attenuation: parseFloat(yeast.attenuation) || undefined,
      },
      createDefaultYeast(),
    );

    return newYeast;
  });

const computeImportMashSteps = (xmlMashSteps: any[], recipeGrainWeight: number) =>
  _.map(xmlMashSteps, mashStep => {
    if (_.isEmpty(mashStep)) {
      return null;
    }
    const newMashStep = _.defaults(
      {
        ..._.pick(mashStep, 'name', 'type'),
        waterRatio: parseFloat(mashStep.infuse_amount)
          ? parseFloat(mashStep.infuse_amount) / recipeGrainWeight
          : undefined,
        temp: parseFloat(mashStep.step_temp) || undefined,
        endTemp: parseFloat(mashStep.end_temp) || undefined,
        time: parseFloat(mashStep.step_time) || undefined,
      },
      {
        waterRatio: parseFloat(mashStep.decoction_amt)
          ? parseFloat(mashStep.decoction_amt) / recipeGrainWeight
          : undefined,
      },
      createDefaultMashStep(),
    );

    return newMashStep;
  });

const computeImportMash = (xmlMash: any, xmlMashSteps: any[], recipeGrainWeight: number) =>
  _.defaults(
    {
      ..._.pick(xmlMash, 'name', 'notes'),
      grainTemp: parseFloat(xmlMash.grain_temp) || undefined,
      spargeTemp: parseFloat(xmlMash.sparge_temp) || undefined,
      ph: parseFloat(xmlMash.ph) || undefined,
      steps: computeImportMashSteps(xmlMashSteps, recipeGrainWeight),
    },
    createDefaultMash(),
  );

export const importBeerXML = async (xml: string) => {
  const beerXmlObject = await parseXML(xml);

  const recipes = findPluralOrSingularAsArray(beerXmlObject, 'RECIPES', 'RECIPE');

  return _.map(recipes, (xmlRecipe: any) => {
    xmlRecipe = lowerKeysDeep(xmlRecipe);
    const xmlHops = findPluralOrSingularAsArray(xmlRecipe, 'hops', 'hop');
    const xmlFermentables = findPluralOrSingularAsArray(xmlRecipe, 'fermentables', 'fermentable');
    const xmlYeasts = findPluralOrSingularAsArray(xmlRecipe, 'yeasts', 'yeast');
    const xmlMiscs = findPluralOrSingularAsArray(xmlRecipe, 'miscs', 'misc');
    const xmlMashSteps = _.map(
      findPluralOrSingularAsArray(xmlRecipe, 'mash.mash_steps', 'mash.mash_steps'),
      'mash_step',
    );

    const fermentables = computeImportFermentables(xmlFermentables);

    const recipeGrainWeight = computeGrainWeight(fermentables);

    const overrideRecipe: Partial<Recipe> = {
      ..._.pick(xmlRecipe, 'name', 'notes'),
      ...pickAndParseFloat(xmlRecipe, 'ibu', 'og', 'est_og', 'fg', 'est_fg', 'color', 'est_color', 'abv', 'est_abv'),
      author: xmlRecipe.brewer,
      type: RecipeTypeMap[xmlRecipe.type as keyof typeof RecipeTypeMap],
      batchSize: parseFloat(xmlRecipe.batch_size) || undefined,
      boilSize: parseFloat(xmlRecipe.boil_size) || undefined,
      mashEfficiency: parseFloat(xmlRecipe.efficiency) || undefined,
      primaryDays: parseFloat(xmlRecipe.primary_age) || undefined,
      primaryTemp: parseFloat(xmlRecipe.primary_temp) || undefined,
      secondaryDays: parseFloat(xmlRecipe.secondary_age) || undefined,
      secondaryTemp: parseFloat(xmlRecipe.secondary_temp) || undefined,
      tertiaryDays: parseFloat(xmlRecipe.tertiary_age) || undefined,
      tertiaryTemp: parseFloat(xmlRecipe.tertiary_temp) || undefined,
      bottlingPressure: parseFloat(xmlRecipe.carbonation) || undefined,
      bottlingTemp: parseFloat(xmlRecipe.carbonation_temp) || undefined,
      agingDays: parseFloat(xmlRecipe.age) || undefined,
      agingTemp: parseFloat(xmlRecipe.age_temp) || undefined,
      fermentables,
      style: computeImportStyle(xmlRecipe),
      spices: computeImportSpices(_.concat(xmlHops, xmlMiscs)),
      yeast: computeImportYeast(xmlYeasts),
      mash: computeImportMash(xmlRecipe.mash, xmlMashSteps, recipeGrainWeight),
    };

    return createRecipe(overrideRecipe);
  });
};
