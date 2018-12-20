// tslint:disable:no-expression-statement
import test from 'ava';
import { calculateRecipe, createRecipe } from './recipe';

test('getABC', () => {
  calculateRecipe(createRecipe());
});
