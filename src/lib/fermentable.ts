import convert from 'convert-units';
import { GLOBALS } from './globals';
import { yieldToPpg } from './utils';

export const computeFermentableGU = (fermentable: any, liters = 1) =>
  (yieldToPpg(fermentable.yield) *
    convert(fermentable.weight)
      .from('kg')
      .to('lb')) /
  convert(liters)
    .from('l')
    .to('gal');

export const computeFermentablePrice = (fermentable: any) => {
  const pricePerKg = /dry|dme/i.test(fermentable.name) ? 8.8 : /liquid|lme/i.test(fermentable.name) ? 6.6 : 4.4;

  return fermentable.weight * pricePerKg;
};

export const computeFermentableAddition = (fermentable: any) =>
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
