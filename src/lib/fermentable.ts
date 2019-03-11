import convert from 'convert-units';
import { GLOBALS } from './globals';
import { RecipeType } from './recipe';
import { yieldToPpg } from './utils';

export enum FermentableType {
  GRAIN = 'Grain',
  SUGAR = 'Sugar',
  LIQUID_EXTRACT = 'Extract',
  DRY_EXTRACT = 'Dry Extract',
  ADJUNCT = 'Adjunct',
}

export type Fermentable = {
  name: string;
  type: 'Grain' | 'Sugar' | 'Extract' | 'Dry Extract' | 'Adjunct';
  yield: number;
  weight: number;
  color: number;
  late?: boolean;
};

export const createDefaultFermentable = (): Fermentable => ({
  name: '',
  type: 'Grain',
  weight: 1.0,
  yield: 75.0,
  color: 2.0,
  late: false,
});

export const computeFermentableGU = (fermentable: Fermentable, liters = 1) =>
  (yieldToPpg(fermentable.yield) *
    convert(fermentable.weight)
      .from('kg')
      .to('lb')) /
  convert(liters)
    .from('l')
    .to('gal');

export const computeFermentablePrice = (fermentable: Fermentable) => {
  const pricePerKg = /dry|dme/i.test(fermentable.name) ? 8.8 : /liquid|lme/i.test(fermentable.name) ? 6.6 : 4.4;

  return fermentable.weight * pricePerKg;
};

export enum FermentableUse {
  MASH = 'mash',
  STEEP = 'steep',
  BOIL = 'boil',
  BOIL_END = 'boilEnd',
}

/**
 * Computes the fermentable use based on the name. Then checks the recipe type to determine if it should be switched.
 * Fermentables switching rules are:
 *   - A mash fermentable found in an extract recipe should become a boil fermentable.
 *   - A steep fermentable found in a partial mash or all grain recipe should become a mash fermentable.
 */
export const computeFermentableUse = (fermentable: Fermentable, recipeType?: RecipeType) => {
  const fermentableUse = /mash/i.test(fermentable.name)
    ? FermentableUse.MASH
    : /steep/i.test(fermentable.name)
    ? FermentableUse.STEEP
    : /boil/i.test(fermentable.name)
    ? FermentableUse.BOIL
    : GLOBALS.FERMENTABLE_BOIL_REGEX.test(fermentable.name)
    ? FermentableUse.BOIL
    : GLOBALS.FERMENTABLE_STEEP_REGEX.test(fermentable.name)
    ? FermentableUse.STEEP
    : FermentableUse.MASH;

  const isMashInExtractRecipe = recipeType === RecipeType.EXTRACT && fermentableUse === FermentableUse.MASH;
  if (isMashInExtractRecipe || fermentableUse === FermentableUse.BOIL) {
    return fermentable.late ? FermentableUse.BOIL_END : FermentableUse.BOIL;
  }

  const isSteepInMashRecipe =
    (recipeType === RecipeType.PARTIAL_MASH || recipeType === RecipeType.ALL_GRAIN) &&
    fermentableUse === FermentableUse.STEEP;
  if (isSteepInMashRecipe) {
    return FermentableUse.MASH;
  }

  return fermentableUse;
};
