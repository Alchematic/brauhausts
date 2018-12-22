import * as _ from 'lodash';
import { GLOBALS } from './globals';

/**
 * Get the approximate time to change a volume of liquid in liters by a
 * number of degrees celcius. Degrees defaults to 80 which is about
 * the temperature difference between tap water and boiling.
 * Input energy is set via BURNER_ENERGY and is measured in
 * kilojoules per hour. It defaults to an average stovetop burner.
 */
export const computeTimeToHeat = (liters: number, degrees: number = 80) => {
  const kj = 4.19 * liters * degrees;

  return (kj / GLOBALS.BURNER_ENERGY) * 60;
};

export const computeDisplayDuration = (minutes: number, approximate?: number) => {
  let durations: string[] = [];

  const factors = [
    { label: 'month', factor: 30 * 60 * 24 },
    { label: 'week', factor: 7 * 60 * 24 },
    { label: 'day', factor: 60 * 24 },
    { label: 'hour', factor: 60 },
    { label: 'minute', factor: 1 },
  ];

  let count = 0;

  _.forEach(factors, ({ label, factor }) => {
    let amount = 0;

    if (factor === 1 || (approximate && count === approximate - 1)) {
      // Round the last item
      amount = Math.round(minutes / factor);
    } else {
      // Get the biggest whole number (e.g. 1 day)
      amount = Math.floor(minutes / factor);
    }

    // Set the remaining minutes
    minutes = minutes % factor;

    // Increment count of factors seen
    if (amount > 0 || count > 0) {
      count++;
    }

    if ((!approximate || count <= approximate) && amount > 0) {
      durations.push(`${amount} ${label}${amount !== 1 ? 's' : ''}`);
    }
  });

  if (!durations.length) {
    durations = ['start'];
  }

  return durations.join(' ');
};

export const yieldToPpg = (yieldPercentage: number) => yieldPercentage * 0.46214;
