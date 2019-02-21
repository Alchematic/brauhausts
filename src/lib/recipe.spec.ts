import * as _ from 'lodash';
import testRecipe1 from '../test-recipe-1.json';
import testRecipe2 from '../test-recipe-2.json';
import testRecipe3 from '../test-recipe-3.json';
import { calculateRecipe, createRecipe, Recipe } from './recipe';

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
