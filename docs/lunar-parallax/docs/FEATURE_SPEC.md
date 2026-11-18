# Product specification — Lunar Parallax

## User purpose
Teach, interactively and reproducibly, how observers at different Earth locations see different Moon altitudes and azimuths at the same instant, and how sightline parallax permits distance estimation. This is a *positive demonstration of spherical and orbital geometry*; do not frame the interface primarily as an argument with flat-Earth users.

## Inputs and V1 defaults
- Longitude, degrees east-positive [-180,180], default **-71.0000**. Both observer sites use this exact longitude in V1.
- Observer A latitude **-53.1627**; observer B latitude **+46.8126**. Inputs [-90,90]. Elevation defaults 0 m with an explicit, consistent convention; latitude on the spherical diagram is geocentric/geodetic identical only for the ideal sphere.
- UTC instant default **2026-11-16T22:24:00Z**; visible UTC entry. Same UTC for all observers, regardless of local civil time.
- Live UTC scrub with a configurable window (e.g. ±12 h with 5-min step), also precise datetime input and step controls; don't let slider silently change date.
- Geometry mode: **ephemeris-backed** (primary) and optionally an explicitly labelled **ideal spherical illustration** mode for educational comparison.

## V1 outputs
- Common-meridian Earth cross-section: circle, centre O, radial OA/OB at chosen latitudes, mathematically perpendicular tangent horizons, sightline arrow/segment for each observer, altitude arc measured from *that tangent* (not a common horizontal), labelled north/south direction.
- Second panel: Earth circle + A/B points correctly positioned; exact-ray endpoint on Moon for an on-meridian case; label parallax angle and straight-line AB chord. Mark **schematic — distances and angles are not to scale**.
- Metrics: each altitude, azimuth, Moon visibility (geometric above/below horizon), great-circle/spherical surface separation vs observer-to-observer chord baseline, observer-to-Moon ranges, Earth-centre-to-Moon range, measured/inferred parallax and calculation methodology.
- Explain: how horizon is tangent/perpendicular to local vertical; distinction between two altitudes vs small parallax between spatial sightline directions; calculation shown with quantities and assumptions. Distinguish Moon *centre* sightlines from limb measurements.
- Clear off-meridian state: if Moon is not in 71°W cross-section, use projection with label and explicit warning, OR show a proper 3D sightline geometry instead of drawing false coplanar convergence. The exact threshold should be justified, not arbitrary.
- Date/time changes must use **one UTC timestamp** shared by all observer calculations. Display local civil times only as supplemental read-only labels.
- Shareable URL state, reset example, accessible slider and numeric inputs, keyboard support; export screenshot/SVG only after geometry validation.

## V2 details
- UTC time scrubbing and transport controls (pause, +/- increments, speed, date change).
- Debounced expensive calculations, deterministic rendering, no drifting state between diagram panels.
- Both 2D and 3D views must remain synchronized to the same time and observer coordinates.
- Show Moon's hour angle relative to common meridian; optional 'jump to transit' using a solved upper transit, not a guessed fixed UTC.

## V3 generalisation
- 2–N observer table: latitude, longitude, elevation, observer label; allow user-defined locations across multiple meridians.
- Geodetic Earth positions -> Earth-fixed vectors -> common inertial/reference-frame transforms -> Moon position; topocentric apparent geometric sightline for every site.
- Render globe, horizon planes, local zeniths and 3D rays; display individual altitude/azimuth and above/below-horizon status.
- Show analytic single-Moon solution and (for noisy measured inputs) closest-approach/least-squares fit, angular residuals and uncertainty; never guarantee all independent *real measured* lines exactly intersect.
- Optional globe map locator. Keep a simple educational workflow before advanced calibration controls.

## UX suggestions
Desktop-first, two diagrams side by side with a small shared top control bar. On narrow screens stack diagram and measurement cards; avoid cluttered full-screen controls. Use restrained cyan/gold observer colours consistent across panels; purple for parallax, accessible contrasts and legends. The 'what changes when you drag time?' explanation should be visible, not buried.