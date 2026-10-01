# UI / UX Specification

# 1. Design Intent

MoonGeometry must look like a polished desktop scientific visualization website.

It should also feel like a compact, functional scientific workbench: controls and data are close at hand, but the main visual explanation remains dominant. The design goal is not decorative polish alone; the interface must help users understand where the Moon is, when it appears, and why the geometry produces that observation.

It must NOT look like:

- a mobile app stretched to desktop width
- a dashboard made from many equal-sized cards
- a stack of oversized form controls
- a generic SaaS admin panel
- a collection of rounded rectangles
- a phone-first layout merely widened for laptop use

The desktop experience is the primary design target.

Mobile support is required, but the desktop layout must be designed independently rather than produced by simply enlarging a narrow mobile layout.

---

# 2. Desktop-First Philosophy

Primary target viewport:

    1440 x 900

Secondary desktop targets:

    1280 x 800
    1600 x 1000
    1920 x 1080

The application should feel deliberately composed at these sizes.

A desktop user should be able to see:

- the main sky visualization
- the main geometry visualization
- core controls
- key numerical values

without excessive scrolling.

The layout should use width intelligently.

Do not place all content in a narrow centered column.

---

# 3. Overall Page Composition

Use a wide scientific workspace.

Recommended maximum content width:

    1400-1560 px

Use moderate outer margins.

Suggested structure:

    ┌─────────────────────────────────────────────────────────────┐
    │ Header / title / short description                         │
    ├─────────────────────────────────────────────────────────────┤
    │ Compact control strip                                      │
    ├──────────────────────────────┬──────────────────────────────┤
    │                              │                              │
    │      OBSERVER SKY            │       GEOMETRY VIEW          │
    │      large visual            │       large visual           │
    │                              │                              │
    │                              │                              │
    ├──────────────────────────────┴──────────────────────────────┤
    │ Time slider / daily timeline                               │
    ├─────────────────────────────────────────────────────────────┤
    │ Key values + explanation + advanced details                │
    └─────────────────────────────────────────────────────────────┘

The two primary visualizations should dominate the first screen.

Controls and data should support the visualizations, not compete with them.

An alternative approved desktop composition is a compact left control rail with a large visualization workspace:

    ┌─────────────────────────────────────────────────────────────┐
    │ Header / title / short description                         │
    ├───────────────┬─────────────────────────────────────────────┤
    │ Collapsible   │ Observer Sky / Geometry workspace           │
    │ control rail  │ large visual explanation                    │
    │               │                                             │
    ├───────────────┴─────────────────────────────────────────────┤
    │ Time slider / daily visibility timeline                     │
    ├─────────────────────────────────────────────────────────────┤
    │ Compact data / explanation / advanced details               │
    └─────────────────────────────────────────────────────────────┘

This layout is preferred when it gives the visualizations more uninterrupted space than a full-width control toolbar.

For the initial production direction, use the left control rail workbench model represented by `sketches/001-left-rail-workbench`. The inspector/data-panel polish from `sketches/003-full-canvas-inspector` may inform later detail panels, but the main shell should prioritize the functional left rail.

---

# 4. Avoid "Card Soup"

Do not wrap every piece of content in a separate card.

Use cards only when a visual boundary communicates a meaningful group.

Preferred:

- one main visualization region
- one compact control strip
- one data region
- one explanation region

Avoid:

- a card for latitude
- a card for longitude
- a card for time
- a card for phase
- a card for altitude
- a card for azimuth
- a card for every small value

Too many card containers make the application look fragmented and mobile-oriented.

---

# 5. Main Visual Hierarchy

The primary visual hierarchy should be:

1. Sky visualization
2. Geometry visualization
3. Time interaction
4. Key observational values
5. Explanation
6. Advanced technical details

The user should understand the core state visually before reading numerical data.

---

# 6. Header

Keep the header compact.

Suggested:

    Moon Geometry
    See where the Moon is - and understand why.

Do not use a large hero section.

Do not waste the first screen with marketing content.

The application itself should begin near the top of the page.

---

# 7. Control Strip

Controls should appear in a compact horizontal toolbar on desktop.

Example:

    Location      Date        Time        Time Zone       [Now]
    Douglas       29 Sep      17:45       Europe/London   [▶]

Controls should use ordinary desktop control sizing.

Avoid very tall touch-first inputs on desktop.

Recommended desktop control height:

    34-40 px

Recommended spacing:

    8-16 px

Use labels above or beside controls where appropriate.

Avoid large empty gaps.

Control groups may also live in a left-side workbench rail. In that case, use collapsible sections such as:

- Observer
- Time
- Visualization
- Find the Moon
- Advanced data

Only the most frequently used sections should be open by default. Advanced astronomical values and rarely changed options should be collapsed.

---

# 8. Two-Panel Main Workspace

The primary desktop workspace should use a two-column layout.

Suggested ratio:

    55% Observer Sky
    45% Geometry View

or:

    50% / 50%

depending on final diagram needs.

Minimum desktop visualization height:

    approximately 420-520 px

The graphics should feel substantial and intentional.

Do not reduce the visualizations to small cards surrounded by UI chrome.

---

# 9. Observer Sky Panel

The Observer Sky should be the visual anchor.

It should feel like an illustrated scientific instrument rather than a generic chart.

Design elements:

- wide aspect ratio
- strong horizon line
- clear compass labels
- Sun and Moon visually distinct
- restrained altitude grid
- soft sky gradient
- large enough Moon symbol to understand its phase
- subtle labels rather than large floating boxes

Preferred aspect ratio:

    approximately 16:9 or 3:2

Avoid a tall portrait-oriented panel.

---

# 10. Geometry Panel

The Geometry panel should visually complement the Observer Sky.

Use similar:

- typography
- line weights
- spacing
- annotation style
- label treatment

The geometry view should not look like a completely different product.

Use controlled SVG composition.

Avoid excessive perspective or decorative 3D effects.

---

# 11. Geometry Tabs

If multiple geometry modes are required, use a compact segmented control:

    Local Horizon | Moon Orbit | Phase Geometry

Do not use large tab cards.

The selected mode should remain visually integrated with the same panel.

---

# 12. Time Slider

The time slider should span most of the content width.

It should visually connect the two main diagrams.

Display important events directly on the timeline:

- sunrise
- sunset
- moonrise
- moonset
- solar noon
- lunar transit

Use subtle markers and labels.

Do not use a generic form slider without contextual markings.

---

# 13. Data Presentation

Use a compact scientific data strip or table.

Example:

    MOON
    Altitude      31.4°
    Azimuth       128.7°
    Illumination  73%
    Elongation    117.2°

    SUN
    Altitude       7.2°
    Azimuth       241.8°

This should be dense but readable.

Prefer aligned numeric columns.

Avoid displaying each metric in a separate large statistic card.

---

# 14. Typography

Use a clean modern sans-serif.

Recommended characteristics:

- neutral
- highly legible
- not overly rounded
- suitable for numerical interfaces

Good options:

- Inter
- IBM Plex Sans
- Source Sans 3
- system UI stack

For technical values, optional monospaced or tabular numerals may be used.

Typography hierarchy:

    Page title: 28-36 px
    Section title: 18-22 px
    Body: 15-17 px
    Labels: 12-14 px
    Numerical values: 15-18 px

Avoid oversized headings.

---

# 15. Spacing

Use tighter desktop spacing than typical mobile-first apps.

Recommended spacing scale:

    4
    8
    12
    16
    24
    32
    48

Most interface gaps should fall between:

    8-24 px

Do not default to 32-48 px gaps between every section.

Large whitespace should be used only where it improves visual hierarchy.

---

# 16. Border Radius

Use restrained rounding.

Recommended:

    4-8 px

Avoid:

    16-24 px rounded cards everywhere

Scientific interfaces generally benefit from a more precise visual language.

---

# 17. Shadows

Use shadows very sparingly.

Do not place every panel in a floating shadowed card.

Preferred separation methods:

- thin borders
- background contrast
- whitespace
- section dividers

If a shadow is used, keep it subtle.

---

# 18. Colour Strategy

Use a restrained palette.

Base:

- neutral background
- neutral text
- subtle panel surfaces
- fine borders

Semantic colours:

- Sun
- Moon
- ecliptic
- lunar orbital plane
- horizon
- daylight/twilight

Colour should support the astronomy, not decorate the UI.

Avoid gradients on interface chrome.

Gradients are appropriate inside the sky visualization.

---

# 19. Background

Use a calm neutral page background.

Examples:

    very light warm grey
    very light cool grey
    near-white

Do not make the entire site dark by default.

Dark mode may be added later.

The visualizations themselves can contain dark or twilight regions where physically meaningful.

---

# 20. Scientific Visual Language

SVG annotations should follow a consistent system.

Use:

- thin measurement lines
- modest arrowheads
- concise labels
- consistent angle arcs
- consistent font sizes
- consistent stroke widths

Avoid:

- cartoon styling
- clip-art look
- thick arrows
- oversized badges
- unnecessary glow effects

---

# 21. Desktop Information Density

Desktop should use available space efficiently.

A user on a 1440 px wide laptop should not see:

- giant controls
- one item per row
- excessive vertical scrolling
- large empty areas
- oversized cards

A good desktop layout should present several related pieces of information simultaneously.

---

# 22. Mobile Layout

Mobile should be a deliberate reflow.

Suggested order:

    Header
    Core controls
    Observer Sky
    Geometry View
    Time slider
    Key data
    Explanation

Do not preserve desktop side-by-side panels if they become too narrow.

Mobile controls may become taller for touch.

Desktop controls must remain compact.

---

# 23. Breakpoints

Suggested:

    < 700 px
    Mobile

    700-1023 px
    Tablet / narrow desktop

    >= 1024 px
    Desktop

    >= 1440 px
    Wide desktop

At 1024 px and above, prefer side-by-side primary visualizations.

---

# 24. Responsive Rules

Desktop responsiveness should not mean:

    one-column layout stretched wider

Instead:

- visualizations grow
- spacing adjusts modestly
- columns remain intentional
- text line lengths remain controlled
- data areas may use additional columns

---

# 25. Progressive Disclosure

Keep the initial interface simple.

Show core values by default.

Place advanced technical information under:

    Advanced details

Possible advanced items:

- RA
- declination
- phase angle
- lunar distance
- topocentric correction
- sidereal time

Do not clutter the primary experience with these values.

---

# 26. Dynamic Explanation

The explanation panel should look editorial, not like another settings card.

Use a short heading and 2-4 concise sentences.

Example:

    Why can you see the Moon now?

    The Moon is 31.4° above your southeast horizon.
    The Sun is still 7.2° above the southwest horizon.
    Both are therefore above your local horizon at the same time.

Keep explanations human-readable.

---

# 27. Desktop Screenshot Test

Before considering the UI acceptable, inspect screenshots at:

    1280 x 800
    1440 x 900
    1920 x 1080

Ask:

- Do the main diagrams dominate?
- Does the page feel like a desktop tool?
- Are controls compact?
- Is width used effectively?
- Is there too much empty vertical space?
- Does it resemble a mobile app enlarged to desktop?
- Are there too many rounded cards?

If the answer to the last two questions is yes, redesign before proceeding.

---

# 28. Anti-Patterns

Explicitly avoid:

- full-width vertical stacks of large cards
- 20+ px border radii everywhere
- huge button heights
- oversized typography
- large hero banners
- excessive gradients
- pill-shaped controls everywhere
- floating glassmorphism panels
- generic dashboard templates
- equal visual weight for every section
- unnecessary icons beside every label
- one metric per card
- excessive empty space
- mobile-first spacing retained unchanged on desktop
- collapsible controls implemented as oversized accordion cards
- hiding essential observation controls behind too much navigation

---

# 29. Reference Design Character

The application should feel closer to:

- an astronomy visualization
- a scientific instrument
- a high-quality educational simulation
- a well-designed engineering tool

than:

- a mobile banking app
- a productivity dashboard
- a SaaS admin panel
- a generic component-library demo

---

# 30. Guiding Principle

Every major visual decision should answer:

> Does this make the astronomical relationship clearer?

If not, remove it.

The interface should feel designed around the visualization, not around reusable UI components.

Before production UI implementation, create and visually inspect a desktop mockup of the main workbench screen. A UI direction is not accepted until it looks clean, compact and functional at laptop desktop sizes, especially 1440 x 900 and 1280 x 800.