export type Yeast = {
  name: string;
  version: number;
  // type: 'ale' | 'lager' | 'wheat' | 'wine' | 'champagne';
  // form: 'liquid' | 'dry' | 'slant' | 'culture';
  attenuation?: number;
};
export const computeYeastPrice = (yeast: Yeast) => (/wyeast|white labs|wlp/i.test(yeast.name) ? 7.0 : 3.5);
