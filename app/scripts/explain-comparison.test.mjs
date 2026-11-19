import assert from 'node:assert/strict';
import test from 'node:test';
import { observedSnapshot } from '../src/lib/astronomy/observed.ts';
import { horizonsExample } from '../src/components/explain-comparison.ts';

test('worked example compares matching observer coordinates and clocks before rounding', (t) => {
  const { app, jpl, request } = horizonsExample();
  const p = new URL(request).searchParams;
  assert.equal(p.get('SITE_COORD'), "'0,51.5,0'");
  assert.equal(p.get('TLIST'), "'2026-11-19 18:00'");
  assert.equal(p.get('APPARENT'), 'AIRLESS');
  const expected = observedSnapshot(Date.UTC(2026, 10, 19, 18), 51.5, 0).moon.horizontal;
  assert.deepEqual(app, expected);
  assert.equal(jpl.azimuthDeg, 150.141875008);
  assert.equal(jpl.altitudeDeg, 33.419757838);
  for (const field of ['azimuthDeg', 'altitudeDeg']) {
    const difference = app[field] - jpl[field];
    t.diagnostic(`${field}: app ${app[field]}, JPL ${jpl[field]}, app minus JPL ${difference}`);
    assert.ok(Math.abs(difference) < 0.02);
  }
});
