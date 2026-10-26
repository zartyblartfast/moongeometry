# Current-location coordinate confirmation

The existing polite status line in Viewing location now confirms successful
geolocation with `Using your location · 51.507° N, 0.128° W` (illustrative fixture).
It formats the active latitude/longitude to three decimal places with compass
letters, using the existing rounding rule and normalizing rounded zero to N/E.
No reverse-geocoding request, new panel, or stored location-source flag is added.
Manual coordinate changes or selecting a searched place clear the confirmation.
Reload does not claim remembered coordinates are a current device reading.
Existing failure messages are preserved.

Verification:
- `node --experimental-strip-types --test src/lib/viewing-location.test.ts`:
  observed the new formatting test fail before implementation; all tests pass after.
- `node scripts/check-current-location.mjs http://localhost:8080`:
  simulated browser geolocation and a stubbed place-search result; passed for
  Pixel 7 portrait/landscape and desktop 1280x800/1440x900. Checked N/W and S/E,
  both coordinate sliders, searched-place selection, reload, and no overflow.
- Screenshot review of the Pixel portrait and 1280 desktop location controls:
  the new confirmation is readable and not clipped.
- Typecheck, targeted ESLint, full `npm test`, build, and `git diff --check`: passed.
- The browser check waits for client civil-time resolution after reload before
  clicking the SSR-visible location button; otherwise a pre-hydration click may
  not invoke the handler.

Physical-device location permission and accuracy are not tested by these fixture
checks. Keep this on `dev01` until the user accepts the preview.
