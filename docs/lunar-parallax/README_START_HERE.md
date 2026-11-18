# MoonGeometry — Lunar Parallax feature handover

**Status:** design-and-code handover, NOT an implemented web feature. Review before coding.

1. Read `docs/HERMES_BRIEF.md` and `docs/FEATURE_SPEC.md`.
2. Inspect `references/approved/final_infographic.png` (the most recently approved visual at the end of the design session).
3. Inspect `references/programmatic/two_panel_original.svg` and `references/programmatic/earth_inset.svg` for mathematically drawn geometry. They are *earlier programmatic references*, not final style masters.
4. Read `prototype/python/make_lunar_parallax_with_earth_inset.py` for the spherical-coordinate construction and explicit perpendicular horizon tangents.
5. Run `python tests/check_spherical_reference.py` for a deterministic verification of the original illustrative geometry.
6. Before coding, inspect MoonGeometry's **current** source, tests, astronomy provider and design skill. Do not assume repository paths/architecture beyond what you verify locally.

## Non-negotiable constraints
- No redesign/regeneration of approved diagram assets during small edits. Use numerical geometry and SVG/Canvas, not generative image rendering, for all educational geometry.
- Example figures were computed with an *ideal sphere* and rounded altitude inputs; **they are not independent observational measurements**. Do not claim distance empirically proved by ephemeris-generated input.
- Earlier WGS84/ephemeris results disagreed slightly with spherical figures. Recompute from the current app's ephemeris and document model, elevation, units and rounding. Do not mix datasets.
- A two-dimensional meridian section is physically exact only when the Moon is coplanar with that section. At arbitrary UTC, identify the representation as a projection or use 3D geometry.
- Keep UI human-first: clear labels, units, practical controls; no unnecessary decorations. Respect existing site styles and Human-First UI skill.

Read `docs/SCIENTIFIC_VALIDATION.md` before publishing any computed values.