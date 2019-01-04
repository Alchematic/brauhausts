import fs from 'fs';
import * as _ from 'lodash';
import caribouSlobberTimeline from '../../testJsonFiles/caribous-slobber-timeline.json';
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
});