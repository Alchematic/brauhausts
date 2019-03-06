import convert from 'convert-units';

export const GLOBALS = {
  ROOM_TEMP: 23, // Room temp in C
  REFRIGERATOR_TEMP: convert(40)
    .from('F')
    .to('C'),
  DEFAULT_SPARGE_TEMP: 76,
  MINUTES_PER_DAY: 1440,

  /**
   * Energy output of the stovetop or gas burner in kilowatts. The default
   * is based on a large stovetop burner that would put out 2, 500 watts.
   * We can assume that about a fifth of that energy is lost.
   */
  BURNER_KW: 2,

  SPECIFIC_HEAT_OF_WATER: 4.186,

  // Average mash heat loss per hour in degrees C
  MASH_HEAT_LOSS: 5.0,

  // Friendly beer color names and their respective SRM values
  COLOR_NAMES: [
    [2, 'pale straw'],
    [3, 'straw'],
    [4, 'yellow'],
    [6, 'gold'],
    [9, 'amber'],
    [14, 'deep amber'],
    [17, 'copper'],
    [18, 'deep copper'],
    [22, 'brown'],
    [30, 'dark brown'],
    [35, 'very dark brown'],
    [40, 'black'],
  ],

  // Relative sugar densities used to calculate volume from weights
  RELATIVE_SUGAR_DENSITY: {
    cornSugar: 1.0,
    dme: 1.62,
    honey: 0.71,
    sugar: 0.88,
  },

  DRY_SPICE_REGEX: /primary|secondary|dry/i,

  FERMENTABLE_STEEP_REGEX: /biscuit|black|cara|chocolate|crystal|munich|roast|special ?b|toast|victory|vienna/i,
  FERMENTABLE_BOIL_REGEX: /candi|candy|dme|dry|extract|honey|lme|liquid|sugar|syrup|turbinado/i,
};
