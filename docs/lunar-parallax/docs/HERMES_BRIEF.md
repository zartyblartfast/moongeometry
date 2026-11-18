# Initial instruction for Hermes Agent

Project: MoonGeometry (`https://github.com/zartyblartfast/moongeometry`, production `https://moongeometry.com`). Implement a future **Lunar Parallax** page/tab, anchored in this handover. Begin with an assessment and short implementation plan; do not immediately rewrite existing app or alter production.

## First assignment (inspection and plan, before code)
1. Read this entire handover, the existing Human-First UI skill, MoonGeometry's README, its actual `app/` tree, the existing astronomy interface and tests.
2. Recommend a feature route/tab consistent with current navigation, a self-contained data model, component boundaries, and test structure.
3. Identify which existing `astronomy-engine` routines can deliver geocentric Moon position/distance and **simultaneous topocentric** horizontal coordinates for arbitrary observers at a single UTC timestamp. Decide how positions and unit vectors share a consistent Earth-fixed/inertial reference frame.
4. Reproduce the seeded 71° W example numerically and explain any discrepancy from the old spherical demo (including choice of model, elevation, Moon out-of-meridian offset, time, and refraction convention). Supply an independent reference check or document limitations.
5. Propose V1/2/3 task slices, with tests, screenshots, and regression checks. Keep current app working; use a feature branch, small commits and a clean build.
6. Ask for user approval of the plan before major coding or UI redesign.

## Then implement after approval
- V1: exact same-longitude two-observer geometry and calculator; interactive latitudes/longitude, UTC datetime, reliable ephemeris-backed sightlines and distances, legible side-by-side schematic + numeric explanation.
- V2: UTC scrub, step and play controls (pause, date jump, playback speed), explanation of meridian crossing and Moon below horizon, deep-linkable state.
- V3: multi-observer, mixed-longitude 3D view with altitude **and azimuth**, common Moon convergence and least-squares intersection/residual visualization; do not use a flat drawing to represent noncoplanar rays as exact.

**Never** use a full-image generative rewrite of the scientifically generated diagrams. Modify only the requested element and validate geometry and adjacent UI.