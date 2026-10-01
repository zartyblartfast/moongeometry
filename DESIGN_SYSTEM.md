# MoonGeometry Design System

# 1. Purpose

This document defines the visual design rules for MoonGeometry.

The purpose is to ensure that all screens and components look like parts of one coherent scientific visualization product.

---

# 2. Core Style

Keywords:

- precise
- calm
- scientific
- modern
- educational
- spacious without being sparse
- desktop-oriented
- visually restrained
- compact scientific workbench
- functional before decorative

Avoid:

- playful
- bubbly
- oversized
- highly rounded
- decorative
- app-store style
- card-heavy

---

# 3. Layout Grid

Desktop content container:

    max-width: 1480px

Recommended page gutter:

    24-40px

Use a 12-column conceptual grid.

Primary visual region:

    7 columns + 5 columns

or:

    6 columns + 6 columns

depending on the visualization.

---

# 4. Spacing Tokens

    --space-1: 4px
    --space-2: 8px
    --space-3: 12px
    --space-4: 16px
    --space-5: 24px
    --space-6: 32px
    --space-7: 48px

Normal interface spacing:

    8-24 px

Large section separation:

    32-48 px

---

# 5. Radius Tokens

    --radius-small: 4px
    --radius-medium: 6px
    --radius-large: 8px

Do not exceed 10px without a specific visual reason.

---

# 6. Border System

Default border:

    1px solid subtle neutral

Use borders to separate technical regions.

Avoid heavy outlines.

---

# 7. Typography

Preferred:

    Inter
    IBM Plex Sans
    Source Sans 3

Fallback:

    system-ui, sans-serif

Use font-weight primarily:

    400
    500
    600

Avoid heavy 700-900 weights except for the main page title if necessary.

---

# 8. Numerical Typography

Use tabular numerals where possible.

CSS:

    font-variant-numeric: tabular-nums;

This helps aligned values feel more technical and stable.

---

# 9. Controls

Desktop control height:

    36px

Primary button:

    36-40px

Mobile:

    44px minimum touch target

Controls should not dominate the page.

Prefer compact control groups and collapsible sections for workbench-style panels. Collapsible headers should be clear and easy to scan, but should not become large card-like blocks. Smooth expand/collapse behaviour is encouraged when it helps keep the workspace compact.

---

# 10. Button Style

Primary action buttons should be visually clear but restrained.

Avoid:

- giant filled buttons
- excessive pill shapes
- gradient buttons
- strong drop shadows

Secondary actions may use outline or text-button styles.

---

# 11. Panel Surfaces

Use at most three meaningful surface levels:

    Page background
    Primary workspace surface
    Secondary detail surface

Do not create a new surface for every element.

For left or side workbench panels, use section dividers, compact headers and subtle surface changes rather than heavy cards. The main visualization area should remain visually dominant.

---

# 12. Data Tables

Prefer dense aligned rows.

Example:

    Altitude         31.4°
    Azimuth         128.7°
    Illumination     73.2%
    Elongation      117.2°

Use:

- compact row height
- clear labels
- aligned values
- subtle separators where needed

---

# 13. Diagram Line Weights

Suggested:

    major geometry: 1.5-2px
    secondary geometry: 1px
    guides: 0.75-1px
    emphasis lines: up to 2.5px

Keep line weights consistent between diagrams.

---

# 14. Diagram Text

Use only essential labels directly inside diagrams.

Avoid paragraph text inside SVG.

Labels should be:

    12-14px desktop

Use external explanations for longer text.

---

# 15. Diagram Symbols

Sun:

- recognizable but restrained
- no cartoon rays unless subtle

Moon:

- phase clearly visible
- enlarged for educational clarity

Observer:

- minimal symbol
- avoid cartoon character style

Earth:

- clean scientific representation

---

# 16. Colour Semantics

Use persistent meaning.

Example categories:

    Sun
    warm accent

    Moon
    pale neutral

    Ecliptic
    one stable series colour

    Lunar orbit
    a second stable series colour

    Horizon
    neutral structural line

    Active control
    interface accent

Never reuse the same colour for unrelated meanings.

---

# 17. Contrast

Text must retain strong contrast.

Guide lines and secondary annotations may be lighter but must remain legible.

Do not use very pale grey text for important values.

---

# 18. Motion

Motion should explain astronomy.

Allowed examples:

- Sun movement
- Moon movement
- Earth rotation
- phase transition
- time slider changes

Avoid:

- bouncing
- decorative fades
- excessive panel transitions
- spring animations
- parallax

---

# 19. Icon Use

Use icons only where they improve recognition.

Good:

- play
- pause
- reset
- location
- share

Avoid adding icons beside every label.

Text is often clearer.

---

# 20. Desktop Composition Check

Every major screen should pass this test:

At 1440px width:

- no major control should look touch-sized unless necessary
- primary visualizations should occupy at least half the visible page area
- there should be meaningful horizontal composition
- the user should see more than one major concept at once
- the layout should not read as a single vertical feed
- controls should feel like a compact desktop workbench, not touch-first mobile controls
- collapsible sections should reduce clutter without hiding the core observation workflow

If a screen fails these checks at common Windows laptop sizes, redesign before adding more functionality.

---

# 21. Consistency Rule

When adding a new feature, first attempt to fit it into the existing visual language.

Do not invent a new:

- radius
- shadow
- card style
- button style
- heading style
- colour

unless the design system genuinely requires extension.