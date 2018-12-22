import * as _ from 'lodash';
import { calculateRecipe, computeRecipeTimeline, createRecipe } from './recipe';

const isObjectEqualWithRoundedNums = (a: any, b: any): boolean =>
  _.isEqualWith(a, b, (a: any, b: any) => {
    if (_.isNumber(a) && _.isNumber(b)) {
      const percentDiff = Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));

      return percentDiff <= 0.15 || _.isNaN(percentDiff);
    }
    if (_.isString(a) && _.isString(b)) {
      if (a === b) {
        return true;
      }
      const aNumbers = _.map(_.words(a, /[0-9]+\.?([0-9]+)?/g), _.toNumber);
      const bNumbers = _.map(_.words(b, /[0-9]+\.?([0-9]+)?/g), _.toNumber);

      if (_.size(aNumbers) === 0 || _.size(bNumbers) === 0) {
        return false;
      }

      return isObjectEqualWithRoundedNums(aNumbers, bNumbers);
    }
  });

const realRecipe = JSON.parse(
  '{"fermentables":[{"name":"Extra pale extract","weight":4,"yield":75,"color":2.5,"late":false}],"spices":[{"name":"Cascade hops","weight":0.028349556839727483,"aa":4.5,"use":"boil","time":60,"form":"pellet"}],"yeast":[{"name":"Wyeast 3052","type":"ale","form":"liquid","attenuation":74}],"name":"Test Recipe","batchSize":20,"ibuMethod":"tinseth","description":"Recipe description","author":"Anonymous Brewer","boilSize":10,"servingSize":0.355,"steepEfficiency":50,"steepTime":20,"mashEfficiency":75,"style":null,"mash":null,"og":0,"fg":0,"color":0,"ibu":0,"abv":0,"price":0,"buToGu":0,"bv":0,"ogPlato":0,"fgPlato":0,"abw":0,"realExtract":0,"calories":0,"bottlingTemp":0,"bottlingPressure":0,"primingCornSugar":0,"primingSugar":0,"primingHoney":0,"primingDme":0,"primaryDays":14,"primaryTemp":20,"secondaryDays":0,"secondaryTemp":0,"tertiaryDays":0,"tertiaryTemp":0,"agingDays":14,"agingTemp":20,"brewDayDuration":null,"boilStartTime":null,"boilEndTime":null,"timelineMap":null}',
);

const calculatedRealRecipe = JSON.parse(
  '{"fermentables":[{"name":"Extra pale extract","weight":4,"yield":75,"color":2.5,"late":false}],"spices":[{"name":"Cascade hops","weight":0.028349556839727483,"aa":4.5,"use":"boil","time":60,"form":"pellet"}],"yeast":[{"name":"Wyeast 3052","type":"ale","form":"liquid","attenuation":74}],"name":"Test Recipe","batchSize":20,"ibuMethod":"tinseth","og":1.0578511208682222,"fg":1.0150412914257378,"ibu":9.374860961354749,"price":25.100086182652795,"timelineMap":{"fermentables":{"mash":[],"steep":[],"boil":[{"fermentable": {"name":"Extra pale extract","weight":4,"yield":75,"color":2.5,"late":false}, "gravity": 57.8511208682222}],"boilEnd":[]},"times":{"60":[{"spice":{"name":"Cascade hops","weight":0.028349556839727483,"aa":4.5,"use":"boil","time":60,"form":"pellet"},"bitterness":0}]},"drySpice":{},"yeast":[{"name":"Wyeast 3052","type":"ale","form":"liquid","attenuation":74}]},"color":3.975310269818716,"abv":5.605598597700153,"ogPlato":14.23949064508318,"fgPlato":3.834495537722688,"realExtract":5.7157186531334645,"abw":4.362800734897111,"calories":189.41686440226036,"primingCornSugar":0.12961975028595002,"primingSugar":0.11794749177270022,"primingHoney":0.15877900931027733,"primingDme":0.17271702105852554,"buToGu":0.1620515008293364,"bv":0.3297080383099409,"description":"Recipe description","author":"Anonymous Brewer","boilSize":10,"servingSize":0.355,"steepEfficiency":50,"steepTime":20,"mashEfficiency":75,"style":null,"mash":null,"bottlingTemp":0,"bottlingPressure":0,"primaryDays":14,"primaryTemp":20,"secondaryDays":0,"secondaryTemp":0,"tertiaryDays":0,"tertiaryTemp":0,"agingDays":14,"agingTemp":20,"brewDayDuration":null,"boilStartTime":null,"boilEndTime":null}',
);

const realRecipe2 = JSON.parse(
  '{"fermentables":[{"name":"Munich liquid extract","weight":2.26795,"yield":75.7346258709,"color":10,"late":false},{"name":"Wheat liquid extract","weight":1.36077,"yield":75.7346258709,"color":3,"late":false},{"name":"Pilsner malt (steeped)","weight":0.226795,"yield":73.5707794175,"color":1,"late":false},{"name":"Caramunich (steeped)","weight":0.226795,"yield":75.7346258709,"color":34,"late":false},{"name":"Aromatic (steeped)","weight":0.1133975,"yield":73.5707794175,"color":19,"late":false}],"spices":[{"name":"Aramis hops","weight":0.0212615166549,"aa":8.1,"use":"Boil","time":60,"form":"Pellet"},{"name":"Aramis hops","weight":0.00708717221828,"aa":8.1,"use":"Boil","time":60,"form":"Pellet"}],"yeast":[{"name":"WLP560 - Classic Saison Ale Blend","type":"Ale","form":"Liquid","attenuation":84}],"name":"Aramis Saison","style":{"og":[1,1.15],"fg":[1,1.15],"ibu":[0,150],"color":[0,500],"abv":[0,14],"carb":[1,4]},"author":"danielgtaylor","batchSize":18.92705,"boilSize":11.35623,"mashEfficiency":75,"description":"Recipe description","servingSize":0.355,"steepEfficiency":50,"steepTime":20,"ibuMethod":"tinseth","mash":null,"og":0,"fg":0,"color":0,"ibu":0,"abv":0,"price":0,"buToGu":0,"bv":0,"ogPlato":0,"fgPlato":0,"abw":0,"realExtract":0,"calories":0,"bottlingTemp":0,"bottlingPressure":0,"primingCornSugar":0,"primingSugar":0,"primingHoney":0,"primingDme":0,"primaryDays":14,"primaryTemp":20,"secondaryDays":0,"secondaryTemp":0,"tertiaryDays":0,"tertiaryTemp":0,"agingDays":14,"agingTemp":20,"brewDayDuration":null,"boilStartTime":null,"boilEndTime":null,"timelineMap":null}',
);

const calculatedRealRecipe2 = JSON.parse(
  '{"fermentables":[{"name":"Munich liquid extract","weight":2.26795,"yield":75.7346258709,"color":10,"late":false},{"name":"Wheat liquid extract","weight":1.36077,"yield":75.7346258709,"color":3,"late":false},{"name":"Pilsner malt (steeped)","weight":0.226795,"yield":73.5707794175,"color":1,"late":false},{"name":"Caramunich (steeped)","weight":0.226795,"yield":75.7346258709,"color":34,"late":false},{"name":"Aromatic (steeped)","weight":0.1133975,"yield":73.5707794175,"color":19,"late":false}],"spices":[{"name":"Aramis hops","weight":0.0212615166549,"aa":8.1,"use":"Boil","time":60,"form":"Pellet"},{"name":"Aramis hops","weight":0.00708717221828,"aa":8.1,"use":"Boil","time":60,"form":"Pellet"}],"yeast":[{"name":"WLP560 - Classic Saison Ale Blend","type":"Ale","form":"Liquid","attenuation":84}],"name":"Aramis Saison","style":{"og":[1,1.15],"fg":[1,1.15],"ibu":[0,150],"color":[0,500],"abv":[0,14],"carb":[1,4]},"author":"danielgtaylor","batchSize":18.92705,"boilSize":11.35623,"mashEfficiency":75,"og":1.0602996535931157,"fg":1.0096479445748985,"ibu":17.775066759970656,"price":33.94436787172289,"timelineMap":{"fermentables":{"mash":[],"steep":[{"fermentable": {"name":"Pilsner malt (steeped)","weight":0.226795,"yield":73.5707794175,"color":1,"late":false}, "gravity": 1.699990233969634},{"fermentable": {"name":"Caramunich (steeped)","weight":0.226795,"yield":75.7346258709,"color":34,"late":false},"gravity":1.7499899467321551},{"fermentable":{"name":"Aromatic (steeped)","weight":0.1133975,"yield":73.5707794175,"color":19,"late":false},"gravity": 0.849995116984817}],"boil":[{"fermentable": {"name":"Munich liquid extract","weight":2.26795,"yield":75.7346258709,"color":10,"late":false}, "gravity": 34.9997989346431},{"fermentable": {"name":"Wheat liquid extract","weight":1.36077,"yield":75.7346258709,"color":3,"late":false},"gravity": 20.99987936078586}],"boilEnd":[]},"times":{"60":[{"spice": {"name":"Aramis hops","weight":0.0212615166549,"aa":8.1,"use":"Boil","time":60,"form":"Pellet"},"bitterness": 0},{"spice": {"name":"Aramis hops","weight":0.00708717221828,"aa":8.1,"use":"Boil","time":60,"form":"Pellet"},"bitterness": 0}]},"drySpice":{},"yeast":[{"name":"WLP560 - Classic Saison Ale Blend","type":"Ale","form":"Liquid","attenuation":84}]},"color":10.100657561905829,"abv":6.667858048422881,"ogPlato":14.81185411741032,"fgPlato":2.470248099146545,"realExtract":4.701610467248635,"abw":5.2172719080530054,"calories":195.00334749781888,"primingCornSugar":0.12961975028595002,"primingSugar":0.11794749177270022,"primingHoney":0.15877900931027733,"primingDme":0.17271702105852554,"buToGu":0.2947789199571786,"bv":0.7577864266251388,"description":"Recipe description","servingSize":0.355,"steepEfficiency":50,"steepTime":20,"ibuMethod":"tinseth","mash":null,"bottlingTemp":0,"bottlingPressure":0,"primaryDays":14,"primaryTemp":20,"secondaryDays":0,"secondaryTemp":0,"tertiaryDays":0,"tertiaryTemp":0,"agingDays":14,"agingTemp":20,"brewDayDuration":null,"boilStartTime":null,"boilEndTime":null}',
);

const realRecipeTimeline2 = JSON.parse(
  `[[0,"Heat 1.6l to 68°C (about 2 minutes)"],[1.9599340406250003,"Add 0.2kg of Pilsner malt (steeped) (1.7 GU), 0.2kg of Caramunich (steeped) (1.7 GU), 0.1kg of Aromatic (steeped) (0.8 GU) and steep for 20 minutes."],[21.959934040625,"Top up the wort to 11.4l and heat to a rolling boil (about 22 minutes)."],[43.959934040625,"Add 2.3kg of Munich liquid extract (35.0 GU), 1.4kg of Wheat liquid extract (21.0 GU), 21g of Aramis hops, 7g of Aramis hops"],[103.959934040625,"Flame out. Begin chilling to 20°C and aerate the cooled wort (about 20 minutes)."],[123.959934040625,"Pitch WLP560 - Classic Saison Ale Blend and seal the fermenter. You should see bubbles in the airlock within 24 hours."],[20283.959934040624,"Prime and bottle about 53 bottles. Age at 20C for 14 days."],[40443.95993404063,"Relax, don't worry and have a homebrew!"]]`,
);

const realRecipe3 = JSON.parse(
  '{"fermentables":[{"name":"Extra pale extract","weight":4,"yield":75,"color":2.5,"late":false},{"name":"Caramel 40L","weight":0.5,"yield":75,"color":40,"late":false}],"spices":[{"name":"Cascade hops","weight":0.028349556839727483,"aa":4.5,"use":"boil","time":60,"form":"pellet"}],"yeast":[{"name":"Wyeast 3052","type":"ale","form":"liquid","attenuation":74}],"name":"Test Recipe","batchSize":20,"primaryDays":10,"secondaryDays":5,"description":"Recipe description","author":"Anonymous Brewer","boilSize":10,"servingSize":0.355,"steepEfficiency":50,"steepTime":20,"mashEfficiency":75,"style":null,"ibuMethod":"tinseth","mash":null,"og":0,"fg":0,"color":0,"ibu":0,"abv":0,"price":0,"buToGu":0,"bv":0,"ogPlato":0,"fgPlato":0,"abw":0,"realExtract":0,"calories":0,"bottlingTemp":0,"bottlingPressure":0,"primingCornSugar":0,"primingSugar":0,"primingHoney":0,"primingDme":0,"primaryTemp":20,"secondaryTemp":0,"tertiaryDays":0,"tertiaryTemp":0,"agingDays":14,"agingTemp":20,"brewDayDuration":null,"boilStartTime":null,"boilEndTime":null,"timelineMap":null}',
);

const calculatedRealRecipe3 = JSON.parse(
  '{"fermentables":[{"name":"Extra pale extract","weight":4,"yield":75,"color":2.5,"late":false},{"name":"Caramel 40L","weight":0.5,"yield":75,"color":40,"late":false}],"spices":[{"name":"Cascade hops","weight":0.028349556839727483,"aa":4.5,"use":"boil","time":60,"form":"pellet"}],"yeast":[{"name":"Wyeast 3052","type":"ale","form":"liquid","attenuation":74}],"name":"Test Recipe","batchSize":20,"primaryDays":10,"secondaryDays":5,"og":1.061466815922486,"fg":1.0159813721398463,"ibu":8.784965678181445,"price":27.300086182652795,"timelineMap":{"fermentables":{"mash":[],"steep":[{"fermentable":{"name":"Caramel 40L","weight":0.5,"yield":75,"color":40,"late":false},"gravity":3.6156950542638877}],"boil":[{"fermentable":{"name":"Extra pale extract","weight":4,"yield":75,"color":2.5,"late":false},"gravity":57.8511208682222}],"boilEnd":[]},"times":{"60":[{"spice":{"name":"Cascade hops","weight":0.028349556839727483,"aa":4.5,"use":"boil","time":60,"form":"pellet"},"bitterness":0}]},"drySpice":{},"yeast":[{"name":"Wyeast 3052","type":"ale","form":"liquid","attenuation":74}]},"color":8.445560926222617,"abv":5.950437511053825,"ogPlato":15.083820745780997,"fgPlato":4.071066375661957,"realExtract":6.06217236577948,"abw":4.626901400595234,"calories":201.16308986616667,"primingCornSugar":0.12961975028595002,"primingSugar":0.11794749177270022,"primingHoney":0.15877900931027733,"primingDme":0.17271702105852554,"buToGu":0.14292208806227905,"bv":0.2907875647248819,"description":"Recipe description","author":"Anonymous Brewer","boilSize":10,"servingSize":0.355,"steepEfficiency":50,"steepTime":20,"mashEfficiency":75,"style":null,"ibuMethod":"tinseth","mash":null,"bottlingTemp":0,"bottlingPressure":0,"primaryTemp":20,"secondaryTemp":0,"tertiaryDays":0,"tertiaryTemp":0,"agingDays":14,"agingTemp":20,"brewDayDuration":null,"boilStartTime":null,"boilEndTime":null}',
);

const realRecipeTimeline3 = JSON.parse(
  `[[0,"Heat 1.4l to 68°C (about 2 minutes)"],[1.7283750000000002,"Add 0.5kg of Caramel 40L (3.6 GU) and steep for 20 minutes."],[21.728375,"Top up the wort to 10.0l and heat to a rolling boil (about 19 minutes)."],[40.728375,"Add 4.0kg of Extra pale extract (57.9 GU), 28g of Cascade hops"],[100.728375,"Flame out. Begin chilling to 20°C and aerate the cooled wort (about 20 minutes)."],[120.728375,"Pitch Wyeast 3052 and seal the fermenter. You should see bubbles in the airlock within 24 hours."],[14520.728375,"Move to secondary fermenter for 5 days."],[21720.728375,"Prime and bottle about 56 bottles. Age at 20C for 14 days."],[41880.728375,"Relax, don't worry and have a homebrew!"]]`,
);

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
  it('should return the result that brauhaus returns for realRecipe', () => {
    const recipe = createRecipe(realRecipe);

    const result = calculateRecipe(recipe);

    // expect(result).toEqual(calculatedRealRecipe);
    expect(isObjectEqualWithRoundedNums(result, calculatedRealRecipe)).toBe(true);
  });

  it('should return the result that brauhaus returns for realRecipe2', () => {
    const recipe = createRecipe(realRecipe2);
    recipe;

    const result = calculateRecipe(recipe);

    // expect(result).toEqual(calculatedRealRecipe2);
    expect(isObjectEqualWithRoundedNums(result, calculatedRealRecipe2)).toBe(true);
  });

  it('should return the result that brauhaus returns for realRecipe3', () => {
    const recipe = createRecipe(realRecipe3);

    const result = calculateRecipe(recipe);

    // expect(result).toEqual(calculatedRealRecipe3);
    expect(isObjectEqualWithRoundedNums(result, calculatedRealRecipe3)).toBe(true);
  });
});

describe('computeRecipeTimeline', () => {
  it('should return the same timeline that brauhaus returns for realRecipe', () => {
    const recipe = createRecipe(realRecipe2);
    const calculatedRecipe = calculateRecipe(recipe);

    const result = computeRecipeTimeline(calculatedRecipe);

    // expect(result).toEqual(realRecipeTimeline2);
    expect(isObjectEqualWithRoundedNums(result, realRecipeTimeline2)).toBe(true);
  });

  it('should return the same timeline that brauhaus returns for realRecipe3', () => {
    const recipe = createRecipe(realRecipe3);
    const calculatedRecipe = calculateRecipe(recipe);

    const result = computeRecipeTimeline(calculatedRecipe);

    // expect(result).toEqual(realRecipeTimeline3);
    expect(isObjectEqualWithRoundedNums(result, realRecipeTimeline3)).toBe(true);
  });
});
