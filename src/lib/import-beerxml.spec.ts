import * as fs from 'fs';
import * as _ from 'lodash';
import { importBeerXML } from './import-beerxml';
import { calculateRecipe } from './recipe';
import { computeRecipeTimeline, Timeline } from './recipe-timeline';

const computeNumsWithMoreThan3Decimals = (timeline: Timeline) => {
  const allInstructions = _.join(_.map(timeline, 'instructions'), '\n');

  return _.words(allInstructions, /[0-9]+\.[0-9]{4}[^\s]+/gi);
};

describe('importBeerXML', () => {
  const importedRecipes = [
    {
      recipe: importBeerXML(fs.readFileSync(`${__dirname}/../../beerxml/caribou-slobber.xml`, 'utf8')),
      name: 'Caribou Slobber',
    },
    {
      recipe: importBeerXML(fs.readFileSync(`${__dirname}/../../beerxml/KamaCitraSessionIPA.xml`, 'utf8')),
      name: 'Kama Citra',
    },
  ];
  _.each(importedRecipes, importedRecipe => {
    describe(`when importing ${importedRecipe.name}`, () => {
      describe('when calculating', () => {
        it('should calculate a recipe', async () => {
          const recipe = _.first(await importedRecipe.recipe);
          const calculatedRecipe = calculateRecipe(recipe);

          expect(calculatedRecipe).toMatchSnapshot();
        });

        it('should calculate an og very similar to the one in the recipe', async () => {
          const recipe = _.first(await importedRecipe.recipe);
          const calculatedRecipe = calculateRecipe(recipe);

          expect(calculatedRecipe.og.toFixed(2)).toBe(calculatedRecipe.est_og.toFixed(2));
        });

        it('should calculate an fg very similar to the one in the recipe', async () => {
          const recipe = _.first(await importedRecipe.recipe);
          const calculatedRecipe = calculateRecipe(recipe);

          expect(calculatedRecipe.fg.toFixed(2)).toBe(calculatedRecipe.est_fg.toFixed(2));
        });

        it('should calculate a color very similar to the one in the recipe', async () => {
          const recipe = _.first(await importedRecipe.recipe);
          const calculatedRecipe = calculateRecipe(recipe);

          expect(calculatedRecipe.color.toFixed(2)).toBe(calculatedRecipe.est_color.toFixed(2));
        });
      });
      describe('when generating timelines', () => {
        describe('when bottling', () => {
          describe('when using metric units', () => {
            it('should generate a recipe timeline', async () => {
              const recipe = _.first(await importedRecipe.recipe);
              const calculatedRecipe = calculateRecipe(recipe);
              const timeline = computeRecipeTimeline(calculatedRecipe);

              expect(timeline).toMatchSnapshot();
            });
            it('should have no numbers with more than 3 decimals in the timeline', async () => {
              const recipe = _.first(await importedRecipe.recipe);
              const calculatedRecipe = calculateRecipe(recipe);
              const timeline = computeRecipeTimeline(calculatedRecipe);

              expect(computeNumsWithMoreThan3Decimals(timeline)).toEqual([]);
            });
          });
          describe('when using imperial units', () => {
            it('should generate a recipe timeline', async () => {
              const recipe = _.first(await importedRecipe.recipe);
              const calculatedRecipe = calculateRecipe(recipe);
              const timeline = computeRecipeTimeline(calculatedRecipe, false);

              expect(timeline).toMatchSnapshot();
            });
            it('should have no numbers with more than 3 decimals in the timeline', async () => {
              const recipe = _.first(await importedRecipe.recipe);
              const calculatedRecipe = calculateRecipe(recipe);
              const timeline = computeRecipeTimeline(calculatedRecipe, false);

              expect(computeNumsWithMoreThan3Decimals(timeline)).toEqual([]);
            });
          });
        });
        describe('when kegging', () => {
          describe('when using metric units', () => {
            it('should generate a recipe timeline', async () => {
              const recipe = _.first(await importedRecipe.recipe);
              const calculatedRecipe = calculateRecipe(recipe);
              const timeline = computeRecipeTimeline(calculatedRecipe, true, false);

              expect(timeline).toMatchSnapshot();
            });
            it('should have no numbers with more than 3 decimals in the timeline', async () => {
              const recipe = _.first(await importedRecipe.recipe);
              const calculatedRecipe = calculateRecipe(recipe);
              const timeline = computeRecipeTimeline(calculatedRecipe, true, false);

              expect(computeNumsWithMoreThan3Decimals(timeline)).toEqual([]);
            });
          });
          describe('when using imperial units', () => {
            it('should generate a recipe timeline', async () => {
              const recipe = _.first(await importedRecipe.recipe);
              const calculatedRecipe = calculateRecipe(recipe);
              const timeline = computeRecipeTimeline(calculatedRecipe, false, false);

              expect(timeline).toMatchSnapshot();
            });
            it('should have no numbers with more than 3 decimals in the timeline', async () => {
              const recipe = _.first(await importedRecipe.recipe);
              const calculatedRecipe = calculateRecipe(recipe);
              const timeline = computeRecipeTimeline(calculatedRecipe, false, false);

              expect(computeNumsWithMoreThan3Decimals(timeline)).toEqual([]);
            });
          });
        });
      });
    });
  });
});
