import { calculateRecipe, createRecipe } from './recipe';
import { isObjectEqualWithRoundedNums } from './utils';

const realRecipe = JSON.parse(
  '{"fermentables":[{"name":"Extra pale extract","weight":4,"yield":75,"color":2.5,"late":false}],"spices":[{"name":"Cascade hops","weight":0.028349556839727483,"aa":4.5,"use":"boil","time":60,"form":"pellet"}],"yeast":[{"name":"Wyeast 3052","type":"ale","form":"liquid","attenuation":74}],"name":"Test Recipe","batchSize":20,"ibuMethod":"tinseth","description":"Recipe description","author":"Anonymous Brewer","boilSize":10,"servingSize":0.355,"steepEfficiency":50,"steepTime":20,"mashEfficiency":75,"style":null,"mash":null,"og":0,"fg":0,"color":0,"ibu":0,"abv":0,"price":0,"buToGu":0,"bv":0,"ogPlato":0,"fgPlato":0,"abw":0,"realExtract":0,"calories":0,"bottlingTemp":0,"bottlingPressure":0,"primingCornSugar":0,"primingSugar":0,"primingHoney":0,"primingDme":0,"primaryDays":14,"primaryTemp":20,"secondaryDays":0,"secondaryTemp":0,"tertiaryDays":0,"tertiaryTemp":0,"agingDays":14,"agingTemp":20,"brewDayDuration":null,"boilStartTime":null,"boilEndTime":null,"timelineMap":null}',
);

const computedRealRecipe = JSON.parse(
  '{"fermentables":[{"name":"Extra pale extract","weight":4,"yield":75,"color":2.5,"late":false}],"spices":[{"name":"Cascade hops","weight":0.028349556839727483,"aa":4.5,"use":"boil","time":60,"form":"pellet"}],"yeast":[{"name":"Wyeast 3052","type":"ale","form":"liquid","attenuation":74}],"name":"Test Recipe","batchSize":20,"ibuMethod":"tinseth","og":1.0578511208682222,"fg":1.0150412914257378,"ibu":9.374860961354749,"price":25.100086182652795,"timelineMap":{"fermentables":{"mash":[],"steep":[],"boil":[[{"name":"Extra pale extract","weight":4,"yield":75,"color":2.5,"late":false},57.8511208682222]],"boilEnd":[]},"times":{"60":[{"spice":{"name":"Cascade hops","weight":0.028349556839727483,"aa":4.5,"use":"boil","time":60,"form":"pellet"},"bitterness":0}]},"drySpice":{},"yeast":[{"name":"Wyeast 3052","type":"ale","form":"liquid","attenuation":74}]},"color":3.975310269818716,"abv":5.605598597700153,"ogPlato":14.23949064508318,"fgPlato":3.834495537722688,"realExtract":5.7157186531334645,"abw":4.362800734897111,"calories":189.41686440226036,"primingCornSugar":0.12961975028595002,"primingSugar":0.11794749177270022,"primingHoney":0.15877900931027733,"primingDme":0.17271702105852554,"buToGu":0.1620515008293364,"bv":0.3297080383099409,"description":"Recipe description","author":"Anonymous Brewer","boilSize":10,"servingSize":0.355,"steepEfficiency":50,"steepTime":20,"mashEfficiency":75,"style":null,"mash":null,"bottlingTemp":0,"bottlingPressure":0,"primaryDays":14,"primaryTemp":20,"secondaryDays":0,"secondaryTemp":0,"tertiaryDays":0,"tertiaryTemp":0,"agingDays":14,"agingTemp":20,"brewDayDuration":null,"boilStartTime":null,"boilEndTime":null}',
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
  it('should return the result that brauhaus returns', () => {
    const recipe = createRecipe(realRecipe);

    const result = calculateRecipe(recipe);

    expect(isObjectEqualWithRoundedNums(result, computedRealRecipe)).toBe(true);
  });
});
