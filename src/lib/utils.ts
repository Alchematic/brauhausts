import convert from 'convert-units';
import * as _ from 'lodash';
import { parseString } from 'xml2js';
import { GLOBALS } from './globals';

/**
 * Get the approximate time to change a volume of liquid in liters by a
 * number of degrees Celsius. Temp defaults to 80 which is about
 * the temperature difference between tap water and boiling.
 * Input energy is set via BURNER_ENERGY and is measured in
 * kilojoules per hour. It defaults to an average stovetop burner.
 */
export const computeTimeToHeat = (volume: number, temp: number = 80, heatEnergy = GLOBALS.BURNER_ENERGY) => {
  const kj = GLOBALS.SPECIFIC_HEAT_OF_WATER * volume * temp;

  return (kj / heatEnergy) * 60;
};

// https://chemistry.stackexchange.com/questions/1240/is-there-a-way-to-calculate-how-fast-water-will-cool
// Assume 26cm wide, 44.28 cm tall pot that can hold 5 gallons
// All math done in meters, liters, and degrees C;
export const computeTimeToCool = (volume: number, startTemp: number, endTemp = GLOBALS.ROOM_TEMP) => {
  console.log({ volume, startTemp, endTemp });
  const containerVolume = convert(5)
    .from('gal')
    .to('l');
  const bottomSurfaceArea = Math.PI * 0.13 * 0.13;
  const totalSideSurfaceArea = 0.4428 * 2 * Math.PI * 0.13;
  const sideSurfaceArea = (volume / containerVolume) * totalSideSurfaceArea;

  const surfaceArea = sideSurfaceArea + bottomSurfaceArea;
  const thermalConductivity = -28.5; // This is the thermal conductivity of stainless steel
  const containerThickness = 0.005; // The average thickness of a large pot (5mm)
  const timeToTempDiff = thermalConductivity * surfaceArea * ((endTemp - startTemp) / containerThickness);

  console.log(timeToTempDiff);
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

export const convertLPerKgToQtPerLb = (lPerKg: number) => {
  const qtPerKg = convert(lPerKg)
    .from('l')
    .to('qt');

  // Converting from lb to kg is the same as converting from 1/kg to 1/lb
  const qtPerLb = convert(qtPerKg)
    .from('lb')
    .to('kg');

  return qtPerLb;
};

export const convertKgToLbOz = (kgs: number) => {
  const lbs = Math.floor(
    convert(kgs)
      .from('kg')
      .to('lb'),
  );
  const oz = Math.round(
    convert(kgs)
      .from('kg')
      .to('oz') % 16,
  );

  return `${lbs > 0 ? `${lbs}lb` : ''} ${oz}oz`;
};

const removeUnnecessaryArray = (value: any): any => {
  if (_.isArray(value) && _.size(value) === 1) {
    return _.cloneDeepWith(_.first(value), removeUnnecessaryArray);
  }
};

export const parseXML = (xmlString: string): Promise<any> =>
  new Promise((resolve, reject) => {
    parseString(xmlString, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(_.cloneDeepWith(result, removeUnnecessaryArray));
    });
  });

export const isObjectEqualWithRoundedNums = (a: any, b: any, percentDiffMax: number): boolean =>
  _.isEqualWith(a, b, (a: any, b: any) => {
    if (_.isNumber(a) && _.isNumber(b)) {
      const percentDiff = Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));

      return percentDiff <= percentDiffMax || _.isNaN(percentDiff);
    }
    if (_.isString(a) && _.isString(b)) {
      if (a === b) {
        return true;
      }
      const aNumbers = _.map(_.words(a, /[0-9]+\.?([0-9]+)?/g), _.toNumber);
      const bNumbers = _.map(_.words(b, /[0-9]+\.?([0-9]+)?/g), _.toNumber);

      if (_.size(aNumbers) === 0 || _.size(bNumbers) === 0) {
        return false;
      }

      return isObjectEqualWithRoundedNums(aNumbers, bNumbers, percentDiffMax);
    }
  });
