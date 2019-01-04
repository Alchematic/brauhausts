import * as _ from 'lodash';
import testRecipe1 from '../../testJsonFiles/test-recipe-1.json';
import testRecipe2 from '../../testJsonFiles/test-recipe-2.json';
import testRecipe3 from '../../testJsonFiles/test-recipe-3.json';
import { calculateRecipe, computeRecipeTimeline, createRecipe, Recipe } from './recipe';

describe('createRecipe', () => {
  it('should create a default recipe if no args are passed', () => {
    const result = createRecipe();

    expect(result.name).toBe('New Recipe');
  });

  it('should create a recipe with any passed props overriding the default props', () => {
    const recipeOverrides = { name: 'Wow What A Recipe!' };

    const result = createRecipe(recipeOverrides);

    expect(result.name).toBe(recipeOverrides.name);
  });
});

describe('calculateRecipe', () => {
  it('should return the previously calculated result that has been compared with brauhaus for realRecipe', () => {
    const recipe = createRecipe(testRecipe1.original as Recipe);

    const result = calculateRecipe(recipe);

    expect(result).toEqual(testRecipe1.calculated);
  });

  it('should return the previously calculated result that has been compared with brauhaus for realRecipe2', () => {
    const recipe = createRecipe(testRecipe2.original as Recipe);

    const result = calculateRecipe(recipe);

    expect(result).toEqual(testRecipe2.calculated);
  });

  it('should return the previously calculated result that has been compared with brauhaus for realRecipe3', () => {
    const recipe = createRecipe(testRecipe3.original as Recipe);

    const result = calculateRecipe(recipe);

    expect(result).toEqual(testRecipe3.calculated);
  });
});

describe('computeRecipeTimeline', () => {
  it('should return the same timeline that brauhaus returns for realRecipe', () => {
    const recipe = createRecipe(testRecipe2.original as Recipe);
    const calculatedRecipe = calculateRecipe(recipe);

    const result = computeRecipeTimeline(calculatedRecipe);

    expect(result).toEqual(testRecipe2.timeline);
  });

  it('should return the same timeline that brauhaus returns for realRecipe3', () => {
    const recipe = createRecipe(testRecipe3.original as Recipe);
    const calculatedRecipe = calculateRecipe(recipe);

    const result = computeRecipeTimeline(calculatedRecipe);

    expect(result).toEqual(testRecipe3.timeline);
  });
});
