export type Yeast = {
  name: string;
  type: 'ale' | 'lager' | 'wheat' | 'wine' | 'champagne';
  form: 'liquid' | 'dry' | 'slant' | 'culture';
  attenuation?: number;
};

export const createDefaultYeast = (): Yeast => ({
  name: '',
  type: 'ale',
  form: 'liquid',
  attenuation: 75.0,
});

export const computeYeastPrice = (yeast: Yeast) => (/wyeast|white labs|wlp/i.test(yeast.name) ? 7.0 : 3.5);
