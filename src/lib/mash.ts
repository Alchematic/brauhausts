import convert from 'convert-units';
import * as _ from 'lodash';
import { GLOBALS } from './globals';
import { computeGrainWeight, Recipe } from './recipe';
import { computeTempString, computeTimeToHeat, convertLPerKgToQtPerLb } from './utils';

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
    recipe && recipeCurrentTemp
      ? computeTimeToHeat(computeGrainWeight(recipe.fermentables), 68 - recipeCurrentTemp)
      : null,
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

  const result = _.assign(newMash, overrideMash);

  return result;
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

export const computeMashStepDescription = (
  mashStep: MashStep,
  stepIndex: number,
  isSiUnits: boolean,
  totalGrainWeight?: number,
) => {
  const absoluteUnits = isSiUnits ? 'l' : 'qt';
  const relativeUnits = isSiUnits ? 'l per kg' : 'qt per lb';
  const temp = computeTempString(mashStep.temp, isSiUnits);
  const waterRatio = isSiUnits ? mashStep.waterRatio : convertLPerKgToQtPerLb(mashStep.waterRatio);
  const waterAmount = computeMashStepWaterAmount(waterRatio, absoluteUnits, relativeUnits, isSiUnits, totalGrainWeight);

  switch (mashStep.type) {
    case MashStepType.Infusion:
      if (stepIndex === 0) {
        return `Allow your mash to rest at ${temp} for ${mashStep.time} minutes.`;
      }

      return `Add about ${waterAmount} of boiling water to your wort until the temperature reaches ${temp}. Let sit for ${
        mashStep.time
      } minutes.`;
    case MashStepType.Temperature:
      return `Adjust your mash temperature to ${temp} and hold for ${mashStep.time} minutes.`;
    case MashStepType.Decoction:
      return `Drain ${waterAmount} from your mash into a kettle and boil. Add back to mash to reach ${temp} and hold for ${
        mashStep.time
      } minutes.`;
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
