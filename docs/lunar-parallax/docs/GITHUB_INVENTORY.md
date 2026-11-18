# GitHub handover inventory

This branch contains the Lunar Parallax **design and source handover**, not an implemented feature.

## Included
- README_START_HERE.md
- docs/HERMES_BRIEF.md
- docs/FEATURE_SPEC.md
- docs/SCIENTIFIC_VALIDATION.md
- prototype/python/make_lunar_geometry.py
- prototype/python/make_lunar_parallax_layout.py
- prototype/python/make_lunar_parallax_with_earth_inset.py
- references/programmatic/geometry_prototype.svg
- references/programmatic/two_panel_original.svg
- references/programmatic/earth_inset.svg
- tests/check_spherical_reference.py

## Not included
PNG image references from the original ZIP could not be uploaded through the connected GitHub text-file interface. The three SVG assets **are included** and can be rendered to PNG or used directly as geometry references. In particular, do not confuse those older programmatic SVG examples with the final approved raster infographic from the design session. Ask the user for that screenshot if visual pixel fidelity is important.

## Engineering caution
This reference is an ideal-sphere construction based on example topocentric altitudes. Reconcile with the existing MoonGeometry ephemeris and observer geometry before publishing date-specific lunar distances. Read docs/SCIENTIFIC_VALIDATION.md first.
