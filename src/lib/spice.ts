import { GLOBALS } from './globals';

export const computeSpiceBitterness = (
  spice: any,
  ibuMethod: 'tinseth' | 'rager',
  earlyOg: number,
  batchSize: number,
) => {
  // Calculate bitterness based on chosen method

  if (ibuMethod === 'tinseth') {
    return (
      1.65 *
      Math.pow(0.000125, earlyOg - 1.0) *
      ((1 - Math.pow(Math.E, -0.04 * spice.time)) / 4.15) *
      (((spice.aa / 100.0) * spice.weight * 1000000) / batchSize) *
      computeSpiceUtilizationFactor(spice)
    );
  } else if (ibuMethod === 'rager') {
    const utilization = 18.11 + 13.86 * Math.tanh((spice.time - 31.32) / 18.27);
    const adjustment = Math.max(0, (earlyOg - 1.05) / 0.2);

    return (
      (spice.weight * 100 * utilization * computeSpiceUtilizationFactor(spice) * spice.aa) /
      (batchSize * (1 + adjustment))
    );
  } else {
    throw new Error(`Unknown IBU method '${ibuMethod}'!`);
  }
};

export const computeSpiceUtilizationFactor = (spice: any) => (spice.form === 'pellet' ? 1.15 : 1.0);

export const computeSpicePrice = (spice: any) => spice.weight * 17.64; // This price stuff is garbo

export const computeIsSpiceDry = (spice: any) => GLOBALS.DRY_SPICE_REGEX.test(spice.use);
