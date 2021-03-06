import testRecipe2 from '../test-recipe-2.json';
import testRecipe3 from '../test-recipe-3.json';
import { calculateRecipe, createRecipe, Recipe } from './recipe';
import { computeRecipeTimeline } from './recipe-timeline';

describe('computeRecipeTimeline', () => {
  it('should return the same timeline that brauhaus returns for realRecipe2', () => {
    const recipe = createRecipe(testRecipe2 as Recipe);
    const calculatedRecipe = calculateRecipe(recipe);

    const result = computeRecipeTimeline(calculatedRecipe);

    expect(result).toMatchSnapshot();
  });

  it('should return the same timeline that brauhaus returns for realRecipe3', () => {
    const recipe = createRecipe(testRecipe3 as Recipe);
    const calculatedRecipe = calculateRecipe(recipe);

    const result = computeRecipeTimeline(calculatedRecipe);

    expect(result).toMatchSnapshot();
  });
});
