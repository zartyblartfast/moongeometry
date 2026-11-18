# Scientific correctness and acceptance criteria

## Important history
The infographic's final-looking graphic is **an educational prototype, not independently observed data**. It uses a spherical Earth (R = 6371 km), two hand-seeded Moon altitudes and spherical constructions. Its output was:
- A: latitude -53.1627°, longitude -71°; Moon geometric altitude 52.166° (seeded)
- B: latitude +46.8126°, longitude -71°; Moon geometric altitude 26.487° (seeded)
- Time label: 2026-11-16 22:24 UTC
- Spherical baseline chord AB = **9759.1726 km**, sightline parallax = **1.3717°**
- Derived A–M = **396372.3227 km**, B–M = **398541.1684 km**, O–M = **401423.1038 km**
These figures are a consistent construction using those *inputs*, NOT independently validated ephemeris outputs for that UTC. Earlier WGS84/ephemeris figures (~399813 km O–M and different angular/observer distances) should **not** be mixed with this example until verified.

## Geometry requirements
1. Under the ideal sphere, A and B are at `R*(cos(phi),sin(phi))` in a meridional cross-section; OA, OB are outward local zeniths; tangent directions are 90° rotations of radius vectors. Check dot products are zero to machine precision.
2. For each sightline in the common plane, define its direction by angle from local outward-facing tangent and intersect lines A + sA dA and B + sB dB; confirm both `s > 0`.
3. AB must be the **straight chord** for triangulation; surface great-circle distance cannot substitute for the chord in the sine rule.
4. Parallax is angle between topocentric sightline direction *unit vectors in a common reference frame* or the internal apex angle at M; it is **not** the difference between altitude readings.
5. At non-transit timestamps a same-meridian two-observer configuration is generally **not coplanar with the Moon**. The exact 2D diagram is a special cross-section/projection; calculate full 3D vectors for accurate general times and state which is drawn.
6. On a WGS84 ellipsoid, local ellipsoidal zenith is not generally radial from Earth centre; do not label a mathematically radial model as a precise WGS84 horizon. For V1 choose an explicit ideal sphere or correct WGS84 local tangent plane using geodetic normal.
7. Moon coordinates from astronomy model, observer coordinates, UTC, frame conversions, azimuth conventions and elevation/refraction conventions must be consistent. Avoid using topocentric apparent refracted angles with geometric 3D rays.
8. Horizon crossing changes visibility, not the existence of the Moon ray. For below-horizon observations label 'not visible' and avoid suggesting direct optical measurement is possible.
9. Inferring distance from model-predicted sightlines and comparing to the model's own distance is a **consistency demonstration**, not an independent measurement. Offer explicit observed-angle input and uncertainty if claiming an actual measurement.
10. Astronomical Moon is at finite distance and moves over UTC; sharing 'local clock' time is not simultaneous observation.

## Required tests
- Exact computed tangent dot products OA·tA=OB·tB=0 (ideal sphere); right-angle markers must be placed correctly.
- Triangle law of sines, AB chord, apex parallax, A–M, B–M and O–M consistent and rounded only for display.
- Reproduce known seeded example with `tests/check_spherical_reference.py`.
- One-UTC test across time zones; UTC date rollovers; longitude wrap -180/+180; pole latitudes; coincident observers; observer antipodes and ill-conditioned triangulation.
- Meridian-crossing: 2D sightlines valid within declared tolerance; outside crossing show projection/3D warning.
- Below-horizon observer and refraction off/on: geometric default matches geometry.
- V3: multiple known synthetic 3D observers converge on one synthetic Moon point; perturb angles and verify least-squares residuals.
- Independent ephemeris comparison (astronomy-engine plus another published/reference calculation), with tolerances and units documented.
- Visual regression tests against reference geometry: tangents perpendicular, origins exactly A/B, angle arcs anchored to proper horizon, no overlapping labels and no regression of existing MoonGeometry app.