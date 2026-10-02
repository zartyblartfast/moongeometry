import type { AstronomyProviderInput } from "../provider.ts";

export type ReferenceCase = {
  name: string;
  input: AstronomyProviderInput;
  expected: {
    d: number;
    sun: ReferenceBody;
    moon: ReferenceBody & {
      eclipticLongitudeDeg: number;
      eclipticLatitudeDeg: number;
      distanceKm: number;
      illumination: number;
      elongationDeg: number;
      waxing: boolean;
      phaseName: string;
    };
    decDeg: number;
    hMeridian: number;
    hFormula: number;
    zenith: readonly [number, number, number];
  };
};

type ReferenceBody = {
  raRad: number;
  decRad: number;
  altitudeDeg: number;
  azimuthDeg: number;
  hourAngleRad: number;
  geocentricUnit: readonly [number, number, number];
};

export type SimpleVsEphemerisCase = {
  name: string;
  input: AstronomyProviderInput;
  /**
   * Stable observed differences between the old schematic provider and the
   * astronomy-engine ephemeris provider. These are expected: the simple model
   * uses mean circular Sun/Moon formulae, while the ephemeris provider includes
   * real apparent/topocentric geometry.
   */
  expectedDifference: {
    moonPositionDeg: number;
    sunPositionDeg: number;
  };
};

/**
 * Source: AstronomyEngine 2.1.19 generated fixture, committed as hard-coded
 * numbers so tests do not recalculate references dynamically or call a network.
 */
export const referenceCases: readonly ReferenceCase[] = [
  {
    name: "London autumn evening with slid orbit",
    input: { instant: 1790886960000, orbitInstant: 1790910000000, latDeg: 51.5, lonDeg: -0.13 },
    expected: {
      d: 9770.625,
      sun: {
        raRad: 3.2789657151404414,
        decRad: -0.05928516760001492,
        altitudeDeg: -27.261156879210898,
        azimuthDeg: 302.4107805754867,
        hourAngleRad: 2.2906568893351587,
        geocentricUnit: [-0.988838850463551, -0.05925044513222085, -0.1367008140632563],
      },
      moon: {
        raRad: 1.3658297949161415,
        decRad: 0.48595527527661103,
        altitudeDeg: 4.599208669603935,
        azimuthDeg: 50.818674375213504,
        hourAngleRad: -2.0913153292056865,
        geocentricUnit: [0.17997105061510535, 0.46705325470745707, 0.8657203233190649],
        eclipticLongitudeDeg: 79.9705891008692,
        eclipticLatitudeDeg: 4.830591916901554,
        distanceKm: 369344.288620022,
        illumination: 0.6631391899478158,
        elongationDeg: 108.97944395254319,
        waxing: false,
        phaseName: "Waning gibbous",
      },
      decDeg: 27.05061241655072,
      hMeridian: 65.55061241655072,
      hFormula: 65.55061241655072,
      zenith: [0.4730864352160571, 0.7826081568524139, -0.4046154935770884],
    },
  },
  {
    name: "Quito March equinox noon",
    input: { instant: 1774008000000, orbitInstant: 1774008000000, latDeg: -0.18, lonDeg: -78.47 },
    expected: {
      d: 9575,
      sun: {
        raRad: 6.275464085766608,
        decRad: -0.003351540961974048,
        altitudeDeg: 9.668345692608725,
        azimuthDeg: 90.01537707295836,
        hourAngleRad: -1.40205349163774,
        geocentricUnit: [0.999964575277302, -0.0033515346874310376, -0.0077211013284287176],
      },
      moon: {
        raRad: 0.27508825383269925,
        decRad: 0.18085994232231176,
        altitudeDeg: -7.445082212310493,
        azimuthDeg: 79.44853688898854,
        hourAngleRad: -1.702371093100048,
        geocentricUnit: [0.9467038622432922, 0.17987555595526444, 0.26720138768991863],
        eclipticLongitudeDeg: 18.86454409235749,
        eclipticLatitudeDeg: 3.369214490028217,
        distanceKm: 368989.3144237981,
        illumination: 0.028116815731430045,
        elongationDeg: 18.973113922835807,
        waxing: true,
        phaseName: "New",
      },
      decDeg: 10.48516941405296,
      hMeridian: 79.33483058594705,
      hFormula: 79.33483058594705,
      zenith: [0.16617910652155632, -0.003141587485879563, -0.9860905815308073],
    },
  },
  {
    name: "Sydney winter predawn",
    input: { instant: 1783275300000, orbitInstant: 1783275300000, latDeg: -33.86, lonDeg: 151.21 },
    expected: {
      d: 9682.260416666666,
      sun: {
        raRad: 1.8242313222471287,
        decRad: 0.3973195552103288,
        altitudeDeg: -33.60936800008667,
        azimuthDeg: 83.52567991485319,
        hourAngleRad: -2.0282066402177215,
        geocentricUnit: [-0.23119915680654654, 0.38694809318011525, 0.8926466955499329],
      },
      moon: {
        raRad: 6.085916290695323,
        decRad: -0.05442517309111191,
        altitudeDeg: 58.62501822534091,
        azimuthDeg: 0.6293499994882268,
        hourAngleRad: -0.005724100732189985,
        geocentricUnit: [0.9791535180027142, -0.054398308274208586, -0.1957018452641996],
        eclipticLongitudeDeg: 348.76134358746134,
        eclipticLatitudeDeg: 1.6004482375747175,
        distanceKm: 388666.07000342564,
        illumination: 0.7121532516894795,
        elongationDeg: 114.98460410208048,
        waxing: false,
        phaseName: "Waning gibbous",
      },
      decDeg: -2.4865139765497446,
      hMeridian: 58.626513976549745,
      hFormula: 58.626513976549745,
      zenith: [0.8143528444702824, -0.5571655152193883, -0.1624685611232936],
    },
  },
];

export const simpleVsEphemerisCases: readonly SimpleVsEphemerisCase[] = [
  {
    name: "London autumn evening with slid orbit",
    input: { instant: 1790886960000, orbitInstant: 1790910000000, latDeg: 51.5, lonDeg: -0.13 },
    expectedDifference: { moonPositionDeg: 0.8980409330817896, sunPositionDeg: 2.1390799186963645 },
  },
  {
    name: "Quito March equinox noon",
    input: { instant: 1774008000000, orbitInstant: 1774008000000, latDeg: -0.18, lonDeg: -78.47 },
    expectedDifference: { moonPositionDeg: 2.5102141982555364, sunPositionDeg: 1.8575905840972875 },
  },
  {
    name: "Sydney winter predawn",
    input: { instant: 1783275300000, orbitInstant: 1783275300000, latDeg: -33.86, lonDeg: 151.21 },
    expectedDifference: { moonPositionDeg: 11.12599919849176, sunPositionDeg: 0.015598351442350626 },
  },
];
