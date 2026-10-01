# Astronomy Model

# 1. Purpose

This document defines the astronomical concepts behind Moon Visibility Explorer.

The visualizations must represent the output of the astronomy model.

The astronomy model must never be inferred from screen geometry.

---

# 2. Fundamental Geometry

The system contains several different reference planes.

Confusing these planes is one of the most common sources of misunderstanding.

---

# 3. The Ecliptic

The ecliptic represents Earth's orbital plane around the Sun.

From Earth, it corresponds approximately to the apparent annual path of the Sun across the celestial sphere.

---

# 4. Lunar Orbital Plane

The Moon orbits Earth in a plane inclined approximately:

    5.145°

relative to the ecliptic.

This does NOT mean that the Moon is normally 5.145° above an observer's horizon.

The orbital inclination and observer altitude are completely different quantities.

---

# 5. Local Horizontal Plane

For an observer on Earth, the local horizontal plane is perpendicular to their local vertical.

For the simplified spherical Earth model:

    local vertical = direction from Earth's centre through observer

and:

    local horizon plane ⟂ local vertical

The horizon is therefore tangent to Earth at the observer.

The observer's horizon changes orientation as Earth rotates.

---

# 6. Celestial Altitude

Altitude is measured from the observer's local horizon.

    +90° = zenith
      0° = horizon
    -90° = nadir

A Moon altitude of:

    +30°

means the Moon is 30° above that observer's horizon.

It says nothing directly about the Moon's position relative to the ecliptic.

---

# 7. Azimuth

Azimuth identifies compass direction around the observer's horizon.

Use:

    North = 0°
    East  = 90°
    South = 180°
    West  = 270°

---

# 8. Equatorial Coordinates

Astronomical positions may initially be represented using:

- right ascension
- declination

These are then transformed to the observer's local horizontal coordinates.

Conceptually:

    ephemeris
       ↓
    RA / Dec
       ↓
    observer longitude
    observer latitude
    sidereal time
       ↓
    local hour angle
       ↓
    altitude / azimuth

---

# 9. Hour Angle

The local hour angle determines how far an astronomical body lies east or west of the observer's meridian.

Conceptually:

    H = LST - RA

where:

    H   = hour angle
    LST = local sidereal time
    RA  = right ascension

---

# 10. Altitude Conversion

For explanatory purposes, altitude can be represented by:

    sin(h) =
        sin(phi) sin(delta)
        +
        cos(phi) cos(delta) cos(H)

where:

    h     = altitude
    phi   = observer latitude
    delta = object declination
    H     = hour angle

Production code should use the selected validated astronomical calculation engine.

The equation is included here to explain the underlying spherical geometry.

---

# 11. Moon Phases

Moon phases arise from the changing Sun-Earth-Moon geometry.

The Moon is always approximately half illuminated by the Sun.

What changes is how much of that illuminated hemisphere is visible from Earth.

Approximate Sun-Moon elongations:

    New Moon
    ~0°

    First Quarter
    ~90°

    Full Moon
    ~180°

    Last Quarter
    ~90°

The visualization should emphasize elongation rather than treating phase as an arbitrary calendar property.

---

# 12. Synodic Month

The lunar phase cycle is approximately:

    29.53 days

This is the synodic month.

It differs from the Moon's orbital period relative to the stars.

---

# 13. Sidereal Month

The Moon completes an orbit relative to the background stars in approximately:

    27.3 days

The difference exists because Earth is also moving around the Sun.

The Moon must travel farther than one 360° orbit relative to the stars before returning to the same Sun-Earth-Moon phase geometry.

---

# 14. Daily Moon Motion

Relative to the stars, the Moon moves generally eastward by approximately:

    13° per day

Relative to the Sun the daily change is somewhat smaller.

This is why moonrise typically occurs later on successive days.

The often quoted approximately 50-minute difference is an average, not a fixed rule.

---

# 15. Daytime Moon Visibility

A Moon can be geometrically visible during daylight whenever:

    Moon altitude > horizon altitude

and:

    Sun altitude > horizon altitude

This occurs frequently.

However, geometrical visibility is not the same as unaided-eye detectability.

Actual visibility depends on:

- illumination
- altitude
- angular separation from Sun
- atmospheric transparency
- haze
- cloud
- observer eyesight
- local obstructions

The application should therefore distinguish these concepts.

---

# 16. Full Moon and Sunset

At exact full Moon, the Moon is approximately opposite the Sun in celestial longitude.

This means that when the Sun is setting, a full Moon is generally close to rising.

The exact relationship varies because of:

- lunar orbital inclination
- lunar declination
- observer latitude
- topocentric parallax
- atmospheric refraction
- the finite angular sizes of the Sun and Moon

The application must calculate positions rather than relying on the simplified statement:

> Full Moon rises exactly at sunset.

---

# 17. Topocentric Position

The Moon is sufficiently close to Earth that observer location affects its apparent position measurably.

Therefore Moon coordinates used for the local sky should be topocentric where supported by the calculation engine.

This is especially important near the horizon.

---

# 18. Atmospheric Refraction

The geometric altitude and apparent altitude are not identical near the horizon.

Atmospheric refraction generally raises the apparent position of astronomical objects close to the horizon.

The application should initially provide:

    Geometric altitude

with an optional:

    Apparent altitude including standard atmospheric refraction

The selected state must be labelled clearly.

---

# 19. Rise and Set

A simplified conceptual definition is:

    rising = object crosses horizon upward
    setting = object crosses horizon downward

Production calculations should account for the conventions used by the selected astronomical library.

For the Moon, apparent radius, parallax and refraction affect the conventional rise/set calculation.

---

# 20. Twilight

Twilight state is determined using solar centre altitude.

Suggested categories:

    Sun altitude > 0°
    Day

    0° to -6°
    Civil twilight

    -6° to -12°
    Nautical twilight

    -12° to -18°
    Astronomical twilight

    below -18°
    Astronomical night

The graphical sky should transition gradually rather than switching abruptly.

---

# 21. Lunar Nodes

Because the Moon's orbital plane is inclined to the ecliptic, the two planes intersect along a line.

The intersection points are:

- ascending node
- descending node

The Moon crosses the ecliptic at these points.

This concept should initially be optional.

It becomes important for explaining eclipses.

---

# 22. Why Eclipses Do Not Occur Every Month

If the lunar orbit were exactly in the ecliptic plane, eclipses would occur much more frequently.

Because the Moon's orbit is inclined by about 5.145°, the Moon normally passes north or south of the exact Sun-Earth alignment at new or full Moon.

Eclipses occur when the phase alignment happens sufficiently close to a lunar node.

This should be considered a future educational extension.

---

# 23. Scale

Default diagrams should not attempt to show the entire system at one physical scale.

Approximate reference values:

    Earth mean diameter
    12,742 km

    Moon diameter
    3,475 km

    mean Earth-Moon distance
    384,400 km

    mean Earth-Sun distance
    ~149.6 million km

Trying to display all objects simultaneously at true scale would make the primary teaching diagrams impractical.

Therefore distinguish between:

    physical scale
    angular geometry
    schematic geometry

---

# 24. Core Rule

Every diagram should be generated from the same astronomical state.

Never position the Moon visually because:

> it looks right.

Instead:

    calculate position
         ↓
    transform coordinates
         ↓
    render position