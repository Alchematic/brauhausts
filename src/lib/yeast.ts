export const computeYeastPrice = (yeast: any) => (/wyeast|white labs|wlp/i.test(yeast.name) ? 7.0 : 3.5);
