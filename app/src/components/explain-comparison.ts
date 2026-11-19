import { observedSnapshot } from '../lib/astronomy/observed.ts';

// Fixed example, not the user's current location. Captured 2026-11-19,
// Horizons DE441, EOP eop.261118.p270214. Preserve the full returned row.
export function horizonsExample() {
  const params = new URLSearchParams({
    format: 'text', COMMAND: '301', OBJ_DATA: 'NO', EPHEM_TYPE: 'OBSERVER',
    CENTER: 'coord@399', COORD_TYPE: 'GEODETIC', SITE_COORD: "'0,51.5,0'",
    QUANTITIES: '4', APPARENT: 'AIRLESS', TIME_TYPE: 'UT', EXTRA_PREC: 'YES',
    TLIST: "'2026-11-19 18:00'",
  });
  return {
    request: `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`,
    app: observedSnapshot(Date.UTC(2026, 10, 19, 18), 51.5, 0).moon.horizontal,
    jpl: { azimuthDeg: 150.141875008, altitudeDeg: 33.419757838 },
  };
}
