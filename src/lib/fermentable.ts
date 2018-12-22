import convert from 'convert-units';
import { GLOBALS } from './globals';
import { yieldToPpg } from './utils';

export type Fermentable = {
  name: string;
  type: 'Grain' | 'Sugar' | 'Extract' | 'Dry Extract' | 'Adjunct';
  yield: number;
  weight: number;
  color: number;
  late?: boolean;
};

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

export const computeFermentableAddition = (fermentable: Fermentable) =>
  /mash/i.test(fermentable.name)
    ? 'mash'
    : /steep/i.test(fermentable.name)
    ? 'steep'
    : /boil/i.test(fermentable.name)
    ? 'boil'
    : GLOBALS.FERMENTABLE_BOIL_REGEX.test(fermentable.name)
    ? 'boil'
    : GLOBALS.FERMENTABLE_STEEP_REGEX.test(fermentable.name)
    ? 'steep'
    : 'mash';
