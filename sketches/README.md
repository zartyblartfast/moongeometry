# MoonGeometry UI Mockups

Disposable desktop-first mockups for selecting the main visual direction before production UI code.

## Variants

| Variant | Path | Design stance | Best use |
|---|---|---|---|
| Left rail workbench | `001-left-rail-workbench/index.html` | Compact scientific instrument with collapsible control rail and large synchronized visualizations | Recommended baseline for the main app shell |
| Top toolbar dual panels | `002-top-toolbar-dual-panels/index.html` | Clean scientific web tool with compact horizontal controls and equal sky/geometry panels | Good v1 fallback if the rail feels too heavy |
| Full canvas inspector | `003-full-canvas-inspector/index.html` | Visualization-first canvas with right-side inspector for explanation/data/math | Strong for a polished visual mode or later iteration |

Open `sketches/index.html` for links to all variants.

## Selected direction

Use **001-left-rail-workbench** as the production UI starting point because it best matches the goal: compact, functional, desktop-native, with collapsible sections and a large visualization workspace. It also gives the app room to grow without turning into card soup.

The right-side panel treatment from **003-full-canvas-inspector** may be used as visual inspiration for future inspector/data panels, but the app shell should begin from 001.

Useful elements to carry forward:

- compact header, no marketing hero
- collapsible sections for Observer, Time, Visualization, Find the Moon, Advanced data
- main visual answer dominates the screen
- timeline directly underneath the primary visuals
- explanation and numerical data visible but secondary
- advanced math/geometry available through progressive disclosure

## Visual verification performed

The three variants were opened in the browser at `1440 x 900` and visually inspected. All render as intended at laptop desktop size. Further review should test `1280 x 800`, `1920 x 1080`, and `390 x 844` before promoting a direction into production UI.