# Mobile slider scroll regression verification

## Scope

Fix URL synchronization on `dev01`; keep `main` and production unchanged.

The mean-solar-time, latitude, and longitude sliders update the share URL.
Earth speed does not. Browser instrumentation traced each affected update to
TanStack Router calling `window.scrollTo({ top: 0, left: 0 })` after the direct
`history.replaceState` call. The previous uncommitted workaround then called
`scrollTo` again to restore the control position.

The replacement uses `useNavigate` with `href`, `replace: true`, and
`resetScroll: false`. URL construction, astronomy, and slider presentation are
unchanged. The superseded uncommitted viewport-restoration experiment was
backed up outside the repository and removed, not incorporated into this fix.

## Regression command

Start the app with `npm run dev`, then run:

```sh
npm run test:sliders -- http://localhost:8080
```

The browser regression uses Chromium with Playwright's Pixel 7 portrait and
landscape profiles and CDP touch events. For each of the four sliders it drags
through twelve intermediate positions and verifies:

- The slider value changes.
- The app makes no scroll-reset or compensating scroll calls.
- The control stays within two CSS pixels of its original viewport position.
- Astronomy controls update the URL, while Earth speed leaves it unchanged.
- Browser history length is unchanged.
- Repeated keyboard input changes the value without moving the viewport.

For both orientations, it verifies the URL matches the selected coordinates and
mean-solar date/time and restores those values in a fresh browser context with
no inherited state or storage. Browser runtime errors fail the test.

## Observed results

- RED before the fix: the first three sliders failed in both orientations,
  showing repeated router scroll-to-top calls followed by compensating scroll
  calls. Earth speed passed in both orientations.
- GREEN after replacing URL navigation and removing the workaround: all four
  touch drags and keyboard checks passed in both orientations. No scroll calls
  were recorded during these interactions. Both fresh-context URL checks passed.
- `npm run typecheck`: passed.
- `npm test`: passed (both executed suites report zero failures).
- `npm run build`: passed.
- `npx eslint src/components/moon-app.tsx scripts/check-slider-scroll.mjs`: passed.
- `git diff --check`: passed.
- Desktop Chromium at 1280x800 and 1440x900: all four mouse drags changed values
  without shifting the control; no horizontal overflow. Screenshot review at
  1280x800 showed intact diagrams and controls.

Existing toolchain notices remain: react-test-renderer deprecation, Node's
experimental MockTimers warning, and the production bundle-size warning.

## Remaining acceptance

Emulated touch is not physical-device verification. The user must confirm
continuous drags on the new Vercel preview using their Google Pixel. Do not
promote this change to production until that check succeeds.
