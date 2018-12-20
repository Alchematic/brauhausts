import { calculateRecipe, createRecipe } from './recipe';

describe('calculateRecipe', () => {
  it('should not have null yeast', () => {
    const recipe = createRecipe();

    const result = calculateRecipe(recipe);

    console.log(result);

    expect(result.yeast).not.toBe(null);
  });
});
