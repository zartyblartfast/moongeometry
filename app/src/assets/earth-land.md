# Earth land raster

`earth-land.png` is a deterministic raster generated from **Natural Earth 1:50m Physical Land, version 4.0.0**.

- Official source: `https://naciscdn.org/naturalearth/50m/physical/ne_50m_land.zip`
- Source archive SHA-256: `0b8e670cf80dce9cbebe2a193bc44ba5602758c22e1fa603980553646d7ff162`
- Generated PNG SHA-256: `2f3c2af5ec9752db57d3a15797d499dcf65ed7e0dc8dcd1c0aa17a0da6f97640`
- Output size: `2048 × 1024` pixels
- Projection: standard, unmirrored equirectangular (west left, east right, north up)
- Ocean: `#18527d`
- Land: `#72a46f`
- Boundaries, labels, and graticules: omitted
- License: Natural Earth data are in the public domain

The generator unwraps polygon rings, creates shifted copies where necessary, and clips them at longitude −180° and +180° before rasterization. It then makes the first and last pixel columns identical so the antimeridian seam tiles cleanly.

From the repository root, generate using the pinned official download:

```sh
node scripts/generate-earth-land-map.mjs
```

To use an already-downloaded archive:

```sh
node scripts/generate-earth-land-map.mjs --source-archive path/to/ne_50m_land.zip
```

The equivalent environment variable is `EARTH_LAND_SOURCE_ARCHIVE`. The archive checksum is verified before parsing. Downloads are written only to a temporary directory and removed after generation. The generator uses repository-local development dependencies and does not require external extraction or image utilities.
