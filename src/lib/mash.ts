import convert from 'convert-units';
import * as _ from 'lodash';
import { GLOBALS } from './globals';
import { computeRecipeGrainWeight, Recipe } from './recipe';
import { computeTimeToHeat, convertLPerKgToQtPerLb } from './utils';

export type Mash = {
  name: string;
  grainTemp: number;
  spargeTemp: number;
  ph: number;
  // Any notes useful for another brewer when mashing
  notes: string;
  steps: Array<MashStep>;
};

// Default to a basic 60 minute single-infusion mash at 68C
export const createDefaultMashStep = (recipe?: Recipe, recipeCurrentTemp?: number): MashStep => ({
  name: 'Saccharification',
  type: MashStepType.Infusion,
  waterRatio: 2.75,
  temp: 68,
  endTemp: null,
  time: 60,
  rampTime:
    recipe && recipeCurrentTemp ? computeTimeToHeat(computeRecipeGrainWeight(recipe), 68 - recipeCurrentTemp) : null,
});

export const createDefaultMash = (): Mash => ({
  steps: [],
  name: '',
  grainTemp: GLOBALS.ROOM_TEMP,
  spargeTemp: GLOBALS.DEFAULT_SPARGE_TEMP,
  ph: null,
  notes: '',
});

export const createMash = (recipe: Recipe, recipeCurrentTemp: number, overrideMash?: Partial<Mash>): Mash => {
  const newMash: Mash = createDefaultMash();
  newMash.steps = [createDefaultMashStep(recipe, recipeCurrentTemp)];

  return _.assign(newMash, overrideMash);
};

export const computeMashStepWaterAmount = (
  waterRatio: number,
  absoluteUnits: string,
  relativeUnits: string,
  isSiUnits: boolean,
  totalGrainWeight?: number,
) => {
  if (totalGrainWeight) {
    const newTotalGrainWeight = !isSiUnits
      ? convert(totalGrainWeight)
          .from('kg')
          .to('lb')
      : totalGrainWeight;

    return `${(waterRatio * newTotalGrainWeight).toFixed(1)}${absoluteUnits}`;
  } else {
    return `${waterRatio.toFixed(1)}${relativeUnits} of grain`;
  }
};

export const computeMashStepDescription = (mashStep: MashStep, isSiUnits: boolean, totalGrainWeight?: number) => {
  const absoluteUnits = isSiUnits ? 'l' : 'qt';
  const relativeUnits = isSiUnits ? 'l per kg' : 'qt per lb';
  const temp = isSiUnits
    ? `${mashStep.temp}C`
    : `${convert(mashStep.temp)
        .from('C')
        .to('F')}F`;
  const waterRatio = isSiUnits ? mashStep.waterRatio : convertLPerKgToQtPerLb(mashStep.waterRatio);
  const waterAmount = computeMashStepWaterAmount(waterRatio, absoluteUnits, relativeUnits, isSiUnits, totalGrainWeight);

  switch (mashStep.type) {
    case MashStepType.Infusion:
      return `Infuse ${waterAmount} for ${mashStep.time} minutes at ${temp}`;
    case MashStepType.Temperature:
      return `Stop heating and hold for ${mashStep.time} minutes at ${temp}`;
    case MashStepType.Decoction:
      return `Add ${waterAmount} boiled water to reach ${temp} and hold for ${mashStep.time} minutes`;
    default:
      return `Unknown mash step type '${mashStep.type}'!`;
  }
};

export enum MashStepType {
  Infusion = 'Infusion',
  Temperature = 'Temperature',
  Decoction = 'Decoction',
}

export type MashStep = {
  name: string;
  type: MashStepType;
  time: number;
  rampTime: number;
  temp: number;
  endTemp: number;
  waterRatio: number;
};
