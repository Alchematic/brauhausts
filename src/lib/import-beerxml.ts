import * as _ from 'lodash';
import { createDefaultFermentable } from './fermentable';
import { createDefaultMash, createDefaultMashStep } from './mash';
import { computeRecipeGrainWeight, createRecipe, Recipe } from './recipe';
import { createDefaultSpice } from './spice';
import { parseXML } from './utils';
import { createDefaultYeast } from './yeast';

/**
 * In beerXML a fermentable may be stored as recipe.fermentable or as recipe.fermentables.fermentable.
 * The same is true with most things that there may be multiple of. This function allows checking for
 * either case and returning the result as an array.
 */
const findPluralOrSingularAsArray = (recipe: any, pluralForm: string, singularForm: string) => {
  const result = _.get(recipe, `${pluralForm}.${singularForm}`, _.get(recipe, `${singularForm}`, []));

  return _.isObject(result) && !_.isArray(result) ? [result] : _.toArray(result);
};

export const importBeerXML = async (xml: string) => {
  const beerXmlObject = await parseXML(xml);

  const recipes = findPluralOrSingularAsArray(beerXmlObject, 'RECIPES', 'RECIPE');

  return _.map(recipes, (xmlRecipe: any) => {
    const hops = findPluralOrSingularAsArray(xmlRecipe, 'HOPS', 'HOP');
    const fermentables = findPluralOrSingularAsArray(xmlRecipe, 'FERMENTABLES', 'FERMENTABLE');
    const yeasts = findPluralOrSingularAsArray(xmlRecipe, 'YEASTS', 'YEAST');
    const miscs = findPluralOrSingularAsArray(xmlRecipe, 'MISCS', 'MISC');
    // There are some weird cases here. Mashs and Styles seem to never actually be used, even though they exist
    // in the beerxml docs. They are almost always listed as a singular mash or style. For now we can't handle multiple
    const styles = findPluralOrSingularAsArray(xmlRecipe, 'STYLES', 'STYLE');
    const mashs = findPluralOrSingularAsArray(xmlRecipe, 'MASHS', 'MASH');
    const mashSteps = findPluralOrSingularAsArray(mashs, '[0].MASH_STEPS', '[0].MASH_STEP');

    const overrideRecipe: Partial<Recipe> = {};

    _.map(xmlRecipe, (value, key) => {
      switch (key.toLowerCase()) {
        case 'name':
          overrideRecipe.name = value;
          break;
        case 'brewer':
          overrideRecipe.author = value;
          break;
        case 'batch_size':
          overrideRecipe.batchSize = parseFloat(value);
          break;
        case 'boil_size':
          overrideRecipe.boilSize = parseFloat(value);
          break;
        case 'efficiency':
          overrideRecipe.mashEfficiency = parseFloat(value);
          break;
        case 'primary_age':
          overrideRecipe.primaryDays = parseFloat(value);
          break;
        case 'primary_temp':
          overrideRecipe.primaryTemp = parseFloat(value);
          break;
        case 'secondary_age':
          overrideRecipe.secondaryDays = parseFloat(value);
          break;
        case 'secondary_temp':
          overrideRecipe.secondaryTemp = parseFloat(value);
          break;
        case 'tertiary_age':
          overrideRecipe.tertiaryDays = parseFloat(value);
          break;
        case 'tertiary_temp':
          overrideRecipe.tertiaryTemp = parseFloat(value);
          break;
        case 'carbonation':
          overrideRecipe.bottlingPressure = parseFloat(value);
          break;
        case 'carbonation_temp':
          overrideRecipe.bottlingTemp = parseFloat(value);
          break;
        case 'age':
          overrideRecipe.agingDays = parseFloat(value);
          break;
        case 'age_temp':
          overrideRecipe.agingTemp = parseFloat(value);
          break;
        case 'ibu':
          overrideRecipe.ibu = parseFloat(value);
          break;
        case 'og':
          overrideRecipe.og = parseFloat(value);
          break;
        case 'est_og':
          overrideRecipe.est_og = parseFloat(value);
          break;
        case 'fg':
          overrideRecipe.fg = parseFloat(value);
          break;
        case 'est_fg':
          overrideRecipe.est_fg = parseFloat(value);
          break;
        case 'color':
          overrideRecipe.color = parseFloat(value);
          break;
        case 'abv':
          overrideRecipe.abv = parseFloat(value);
          break;
        case 'est_abv':
          overrideRecipe.est_abv = parseFloat(value);
          break;
      }
    });

    overrideRecipe.style = {
      name: '',
      category: '',
      og: [1.0, 1.15],
      fg: [1.0, 1.15],
      ibu: [0, 150],
      color: [0, 500],
      abv: [0, 14],
      carb: [1.0, 4.0],
    };
    if (_.size(styles) > 1) {
      console.warn(`We currently do not support having more than one style in a recipe. The recipe acts as if
        only the first style exists.`);
    }
    _.each(_.first(styles), (styleValue, styleKey) => {
      switch (styleKey.toLowerCase()) {
        case 'name':
          overrideRecipe.style.name = styleValue;
          break;
        case 'category':
          overrideRecipe.style.category = styleValue;
          break;
        case 'og_min':
          overrideRecipe.style.og[0] = parseFloat(styleValue);
          break;
        case 'og_max':
          overrideRecipe.style.og[1] = parseFloat(styleValue);
          break;
        case 'fg_min':
          overrideRecipe.style.fg[0] = parseFloat(styleValue);
          break;
        case 'fg_max':
          overrideRecipe.style.fg[1] = parseFloat(styleValue);
          break;
        case 'ibu_min':
          overrideRecipe.style.ibu[0] = parseFloat(styleValue);
          break;
        case 'ibu_max':
          overrideRecipe.style.ibu[1] = parseFloat(styleValue);
          break;
        case 'color_min':
          overrideRecipe.style.color[0] = parseFloat(styleValue);
          break;
        case 'color_max':
          overrideRecipe.style.color[1] = parseFloat(styleValue);
          break;
        case 'abv_min':
          overrideRecipe.style.abv[0] = parseFloat(styleValue);
          break;
        case 'abv_max':
          overrideRecipe.style.abv[1] = parseFloat(styleValue);
          break;
        case 'carb_min':
          overrideRecipe.style.carb[0] = parseFloat(styleValue);
          break;
        case 'carb_max':
          overrideRecipe.style.carb[1] = parseFloat(styleValue);
          break;
      }
    });
    overrideRecipe.fermentables = _.map(fermentables, fermentable => {
      const newFermentable = createDefaultFermentable();
      _.each(fermentable, (fermentableValue, fermentableKey) => {
        switch (fermentableKey.toLowerCase()) {
          case 'name':
            newFermentable.name = fermentableValue;
            break;
          case 'amount':
            newFermentable.weight = parseFloat(fermentableValue);
            break;
          case 'yield':
            newFermentable.yield = parseFloat(fermentableValue);
            break;
          case 'color':
            newFermentable.color = parseFloat(fermentableValue);
            break;
          case 'add_after_boil':
            newFermentable.late = fermentableValue.toLowerCase() === 'true';
            break;
        }
      });

      return newFermentable;
    });

    overrideRecipe.spices = _.map(_.concat(hops, miscs), spice => {
      const newSpice = createDefaultSpice();
      _.each(spice, (spiceValue, spiceKey) => {
        switch (spiceKey.toLowerCase()) {
          case 'name':
            newSpice.name = spiceValue;
            break;
          case 'amount':
            newSpice.weight = parseFloat(spiceValue);
            break;
          case 'alpha':
            newSpice.aa = parseFloat(spiceValue);
            break;
          case 'use':
            newSpice.use = spiceValue;
            break;
          case 'form':
            newSpice.form = spiceValue;
            break;
          case 'time':
            newSpice.time = spiceValue;
            break;
        }
      });

      return newSpice;
    });

    overrideRecipe.yeast = _.map(yeasts, yeast => {
      const newYeast = createDefaultYeast();
      _.each(yeast, (yeastValue, yeastKey) => {
        switch (yeastKey.toLowerCase()) {
          case 'name':
            newYeast.name = yeastValue;
            break;
          case 'type':
            newYeast.type = yeastValue;
            break;
          case 'form':
            newYeast.form = yeastValue;
            break;
          case 'attenuation':
            newYeast.attenuation = parseFloat(yeastValue);
            break;
        }
      });

      return newYeast;
    });

    if (_.size(mashs) > 1) {
      console.warn(`We currently do not support having more than one mash in a recipe. The recipe acts as if
        only the first mash exists.`);
    }
    overrideRecipe.mash = createDefaultMash();
    _.each(_.first(mashs), (mashValue, mashKey) => {
      switch (mashKey.toLowerCase()) {
        case 'name':
          overrideRecipe.mash.name = mashValue;
          break;
        case 'grain_temp':
          overrideRecipe.mash.grainTemp = parseFloat(mashValue);
          break;
        case 'sparge_temp':
          overrideRecipe.mash.spargeTemp = parseFloat(mashValue);
          break;
        case 'ph':
          overrideRecipe.mash.ph = parseFloat(mashValue);
          break;
        case 'notes':
          overrideRecipe.mash.notes = mashValue;
          break;
      }
    });
    // Must calculate mash steps after fermentables due to the use of fermentables to compute grain weight
    const newMashSteps = _.map(mashSteps, mashStep => {
      const newMashStep = createDefaultMashStep();
      _.each(mashStep, (mashStepValue, mashStepKey) => {
        switch (mashStepKey.toLowerCase()) {
          case 'name':
            newMashStep.name = mashStepValue;
            break;
          case 'type':
            newMashStep.type = mashStepValue;
            break;
          case 'infuse_amount':
            newMashStep.waterRatio = parseFloat(mashStepValue) / computeRecipeGrainWeight(overrideRecipe as Recipe);
            break;
          case 'step_temp':
            newMashStep.temp = parseFloat(mashStepValue);
            break;
          case 'end_temp':
            newMashStep.endTemp = parseFloat(mashStepValue);
            break;
          case 'step_time':
            newMashStep.time = parseFloat(mashStepValue);
            break;
          case 'decoction_amt':
            newMashStep.waterRatio = parseFloat(mashStepValue) / computeRecipeGrainWeight(overrideRecipe as Recipe);
            break;
        }
      });

      return newMashStep;
    });
    _.set(overrideRecipe, 'mash.steps', newMashSteps);

    return createRecipe(overrideRecipe);
  });
};
