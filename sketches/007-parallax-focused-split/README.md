# Variant 007 — Parallax focused split

## Design stance

A compact scientific workbench with one shared top toolbar and two synchronized diagrams. The layout follows the approved infographic’s teaching order—first local tangent altitudes, then sightline convergence—but treats both as live model views rather than poster panels.

## Key choices

- **Focused toolbar:** observer latitudes, shared longitude, one UTC instant, scrubber, transit reset, and explanation toggle stay together above the diagrams.
- **Semantic colour:** MoonGeometry gold identifies Observer A, cyan identifies Observer B, and purple is reserved for parallax and projected-state language.
- **Baseline-faithful Diagram 1:** `docs/lunar-parallax/docs/baseline.png` is the structural reference. Earth stays on the left; A and B sit on its circumference; OA and OB establish the radius normals; dashed tangent horizons pass through the observers; solid Moon sightlines continue off-panel; and each altitude is the explicit angle between its tangent and sightline. Diagram 1 deliberately does not draw the Moon.
- **Common distant target:** time changes rotate both sightlines as a coupled pair. Their separation stays near the modelled parallax angle, so they remain visually almost parallel and cannot cross inside Diagram 1.
- **Geographic orientation:** Diagram 1 includes faint equator and tropic reference planes plus marked north and south poles. Diagram 2 carries only the equator so its convergence geometry stays uncluttered.
- **Visibility boundary:** the time control shows live A/B altitude and visibility, and coloured ticks mark any `0°` horizon crossing inside the ±12-hour range. Below-horizon sightlines turn dashed red, receive an obstruction mark and `Earth blocks view` message in Diagram 1, and retain the same blocked treatment in Diagram 2 so the modelled ray remains traceable without implying it is observable.
- **Unmistakably schematic Diagram 2:** the panel header, SVG and explanatory callout all state that distances and angles are not to scale. The copy explains that the geometry is deliberately compressed to reveal the tiny parallax convergence.
- **Shared-state split:** both panels redraw from the same UTC instant and observer fields. At transit, Diagram 1 says the north–south cross-section closely matches the true 3D geometry. At other times it gives the Moon’s east/west offset from the shared longitude and plainly says the cross-section simplifies the full 3D sightlines.
- **Aligned results:** local observations, geometry outputs, and the model/measurement caveat use dense definition lists instead of dashboard cards.
- **Scientific wording:** the resting values use the approved authoritative stance—Astronomy Engine 2.1.19 plus WGS84—and are explicitly presented as model outputs, not independent observations. The sketch distinguishes local altitude from the common-frame parallax angle and names the chord baseline used for triangulation.
- **Responsive stance:** desktop keeps the diagrams side by side at 1440×900. Pixel-class portrait stacks complete panels; short landscape keeps both panels side by side and compresses secondary notes and metrics.
- **Self-contained:** no build step, network request, font download, framework, or external dependency.

## Interactions

- Scrub ±12 hours around the seeded `2026-11-16 22:24 UTC` transit state, with the exact UTC date and time displayed live above the control.
- Step backward or forward by five minutes, jump back to transit, or reset the full example; every action updates the same visible UTC readout.
- Edit either observer latitude or the shared longitude.
- Toggle the extended explanation.
- Watch the cross-section state, off-plane explanation, altitudes, azimuths, parallax, ranges, and diagrams update together.

## Intentional trade-offs

- `geometry.js` rotates the Astronomy Engine Moon vector into equatorial axes of date and the shared meridian frame, then subtracts each sea-level WGS84 observer. Both panels omit the east component; only the second compresses lunar distance. Away from the plane, the numeric 3D angles are not drawn as projected angle arcs. Ephemeris, snapshot, transit and geometric horizon searches use bounded caches.
- The offline `astronomy.browser.min.js` is the installed Astronomy Engine 2.1.19 browser distribution, including its MIT license header. SHA-256: `f41139a87941ea017ab902b954c9389fa27ea72083d7fab4971756d7769d14e6`. To refresh the same version, copy `../../app/node_modules/astronomy-engine/astronomy.browser.min.js` here and compare hashes.
- UTC entry recentres the scrubber on the entered instant without rounding; Go to transit selects the nearest upper transit for the current longitude. Run `node check-geometry.mjs` here for the focused Playwright/Chromium regression.
- Observer longitudes remain linked to match the focused V1 teaching case. A production multi-longitude tool should move to authoritative 3D geometry rather than forcing convergence into this 2D section.
- The toolbar is near its practical density limit. Elevation, refraction, uncertainty, playback, and multi-observer controls should live in a secondary inspector or later workflow rather than expanding this first row.
- The approved infographic’s large captions and poster framing were reduced so diagrams remain primary in an interactive desktop workspace.
- This revision replaces the rejected generic tangent-horizon composition. It remains pending user approval and must not be treated as the selected production direction yet.
