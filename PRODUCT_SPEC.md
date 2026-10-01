# Product Specification

> **Documentation status:** This is a planning / next-design document. The current runnable app is in `app/` and is a React/Vite/Three.js two-view prototype, not the full SVG-first Moon Visibility Explorer described here. See `README.md` for the current build status.


## Project Name

Working title:

# Moon Visibility Explorer

Alternative names can be considered later.

---

# 1. Purpose

Moon Visibility Explorer is an educational astronomy application designed to answer:

> Where should the Moon be in the sky from my location, and why?

It should combine prediction, observation and geometry in one interface.

The product must make the Moon's apparent position understandable for a specific observer, date and time. A user should be able to see where the Moon appears, when it is above the horizon, how that relates to the Sun, and why the geometry produces that observation. Users who want to go deeper should be able to inspect the mathematical and geometric basis of the result without that detail overwhelming the primary visual explanation.

The application should be understandable by users with little or no astronomy knowledge while retaining sufficient numerical information to be useful for more technical investigation.

---

# 2. Main User Questions

The application should answer questions such as:

- Can I see the Moon during daylight today?
- Where should I look?
- What direction is the Moon?
- How high above the horizon is it?
- Why can the Moon and Sun sometimes appear in the sky simultaneously?
- Why is the Moon sometimes visible in the morning and sometimes in the afternoon?
- Why does the Moon rise at different times each day?
- Why does the Moon have phases?
- Why does the Moon's path change through the month?
- What does the Moon's 5.145° orbital inclination actually mean?
- How is the lunar orbital plane different from my local horizon?
- When will the Moon rise or set?
- What will the Moon look like from a particular location, date and time?

---

# 3. Intended Audience

The application should work for:

- casual observers
- students
- teachers
- amateur astronomers
- photographers
- people interested in celestial navigation
- users investigating competing geometric explanations of astronomical observations

The interface must not assume prior understanding of astronomical coordinate systems.

---

# 4. Core Interaction

The main controls are:

- latitude
- longitude
- date
- local time
- timezone
- time slider

Optional convenience features may include:

- location search
- browser location
- preset locations
- current time
- today button

The user should be able to drag the time slider through 24 hours and watch every visualization update continuously.

The primary interaction model should resemble a compact desktop workbench:

- a large uninterrupted visualization workspace
- compact controls grouped by task
- collapsible sections for secondary options and advanced data
- immediate visual feedback when time, location or view mode changes
- clear distinction between practical observation guidance and deeper astronomical explanation

---

# 5. Main Views

## 5.1 Observer Sky

Purpose:

Show what the observer would actually see.

Must contain:

- horizon
- cardinal directions
- Sun
- Moon
- Moon illumination
- altitude scale
- azimuth
- sky brightness state

Optional overlays:

- ecliptic
- celestial equator
- Moon path
- Sun path
- coordinate grid

This is the primary observational view.

---

## 5.2 Local Horizon Geometry

Purpose:

Explain altitude and horizon geometry.

Show:

- spherical Earth
- observer location
- radial/local vertical direction
- tangent local horizon
- direction toward Moon
- direction toward Sun
- altitude angle of Moon
- altitude angle of Sun

This view should make the following relationship visually obvious:

    local vertical
         |
         |
         O observer
    -----+----- local horizon
          \
           \ line of sight

The observer's horizon moves as Earth rotates.

The lunar orbital plane does not define the observer's horizon.

---

## 5.3 Earth-Moon-Sun Geometry

Purpose:

Explain lunar phases and orbital geometry.

Show:

- Earth
- Moon
- Sun direction
- ecliptic plane
- lunar orbital plane
- lunar orbital inclination
- Moon's illuminated hemisphere
- Moon's visible hemisphere
- Sun-Moon elongation

The default view should be schematic rather than physically scaled.

It must state this clearly.

---

## 5.4 Daily Visibility Timeline

Display a 24-hour timeline containing:

- daylight period
- civil twilight
- nautical twilight
- astronomical twilight
- night
- Moon above/below horizon
- Moon rise
- Moon transit
- Moon set
- sunrise
- solar transit
- sunset

The overlap between daylight and Moon-above-horizon should be immediately visible.

---

## 5.5 Observation Data Panel

Display precise numerical values.

Minimum fields:

### Observer

- latitude
- longitude
- date
- local time
- UTC
- timezone

### Sun

- altitude
- azimuth
- right ascension
- declination
- rise time
- transit time
- set time

### Moon

- altitude
- azimuth
- right ascension
- declination
- distance
- rise time
- transit time
- set time
- illuminated fraction
- phase
- elongation
- lunar age

### Environment

- Sun altitude
- daylight/twilight state

---

# 6. Time Animation

Provide animation modes such as:

- 1 minute per second
- 10 minutes per second
- 1 hour per second
- 1 day per second

At slow speeds the app demonstrates Earth's rotation.

At faster speeds the app demonstrates lunar orbital motion and phase change.

Animation must have:

- play
- pause
- reset
- speed selector

Changing time must update every visualization from the same shared state.

---

# 7. Daylight Moon Mode

Provide a dedicated feature:

# Find the Moon Today

This should determine periods when:

- Moon altitude > 0°
- Sun altitude > 0°

and display the resulting daytime overlap.

An optional practical visibility estimate may consider:

- Moon illumination
- Moon altitude
- solar altitude
- Sun-Moon elongation

However, the application must distinguish:

> Geometrically above the horizon

from:

> Likely visible to the unaided eye

The latter depends on atmospheric and observational conditions.

---

# 8. Verify an Observation

Provide an observation-verification mode.

Input:

- location
- date
- exact time

Output:

    SUN
    Altitude:
    Azimuth:

    MOON
    Altitude:
    Azimuth:
    Illumination:
    Elongation:

    BOTH ABOVE HORIZON:
    Yes / No

Provide a Copy Result button.

This allows predictions to be compared directly with photographs or observations.

---

# 9. Educational Explanations

The application should contain short contextual explanations rather than large blocks of text.

Explanations should answer the user's likely question at the current moment:

- Where is the Moon?
- Is it above my horizon?
- Is the Sun also above my horizon?
- What phase is the Moon, and why?
- Which geometric relationship explains what I am seeing?

Advanced mathematical details should be available through progressive disclosure rather than shown as default clutter.

Example:

> The Moon's orbit is tilted approximately 5.145° relative to the ecliptic. This is not the Moon's altitude above your horizon. Your horizon is a local tangent plane determined by your position on Earth.

Another:

> The sky remains illuminated after the Sun drops below the geometric horizon because sunlight continues to illuminate the atmosphere.

---

# 10. Twilight

Determine sky state using solar altitude.

Suggested classification:

    Sun altitude > 0°
        Day

    0° to -6°
        Civil twilight

    -6° to -12°
        Nautical twilight

    -12° to -18°
        Astronomical twilight

    < -18°
        Astronomical night

The visual transition should be gradual.

---

# 11. Diagram Accuracy

No diagram should imply physical scale unless it actually uses physical scale.

Each visualization must distinguish between:

- scale
- direction
- angle
- topology

Default educational diagrams should preserve meaningful angular relationships while exaggerating physical sizes and distances.

Suggested annotation:

> Schematic: object sizes and distances are exaggerated for clarity. Calculated angular relationships are preserved.

---

# 12. True Scale Mode

A later feature may show Earth and Moon at their approximately true relative scale.

Useful reference values:

Earth mean diameter:
~12,742 km

Moon diameter:
~3,475 km

Mean Earth-Moon distance:
~384,400 km

This mode exists primarily to demonstrate why educational astronomical diagrams generally require scale distortion.

---

# 13. URL State

Application state should eventually be representable in the URL.

Example concept:

    ?lat=54.15
    &lon=-4.48
    &date=2026-09-29
    &time=17:45

This allows observations and diagrams to be shared reproducibly.

---

# 14. Non-Goals for Version 1

Version 1 does not need:

- photorealistic rendering
- detailed lunar terrain
- star catalogues
- telescope control
- weather forecasts
- satellite tracking
- advanced eclipse prediction
- relativistic corrections
- planetary ephemerides

The first objective is to make the basic Earth-Moon-Sun geometry exceptionally clear.