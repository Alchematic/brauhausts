import fs from 'fs';
import * as _ from 'lodash';
import caribouSlobberTimeline from '../caribous-slobber-timeline.json';
import kamaCitraTimeline from '../kama-citra-timeline.json';
import { importBeerXML } from './import-beerxml';
import { calculateRecipe } from './recipe';
import { computeRecipeTimeline } from './recipe-timeline';

describe('importBeerXML', () => {
  it('should read the caribou slobber xml and generate a recipe timeline', async () => {
    const beerXML = fs.readFileSync(`${__dirname}/../../beerxml/caribou-slobber.xml`, 'utf8');

    const result = await importBeerXML(beerXML);
    const caribouSlobberRecipe = _.first(result);
    const calculatedRecipe = calculateRecipe(caribouSlobberRecipe);
    const timeline = computeRecipeTimeline(calculatedRecipe);

    expect(timeline).toEqual(caribouSlobberTimeline);
  });

  it('should read the Kama Citra xml and generate a recipe timeline', async () => {
    const beerXML = fs.readFileSync(`${__dirname}/../../beerxml/KamaCitraSessionIPA.xml`, 'utf8');

    const result = await importBeerXML(beerXML);
    const kamaCitraRecipe = _.first(result);
    const calculatedRecipe = calculateRecipe(kamaCitraRecipe);
    const timeline = computeRecipeTimeline(calculatedRecipe);

    expect(timeline).toEqual(kamaCitraTimeline);
  });
});
