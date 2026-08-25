# The Nocturne Atlas

**English** · [繁體中文](README.zh-TW.md)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?logo=threedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

An original, seed-driven 3D wizarding world built with Three.js and TypeScript.

**[Live demo](https://malilion.github.io/The-Nocturne-Atlas/)**

## Scene Gallery

The paired night and daylight galleries were captured from the deterministic `MAGIC-001` world with generator `2.9.0` at Medium quality. All twenty images are actual scene-switch destinations with the tour paused after arrival, including the three seeded interiors and the resident world cast.

### Night

| 1 · Castle of Veyra | 2 · Lumen Row |
| --- | --- |
| ![Castle of Veyra scene with gothic towers and floating candles](docs/screenshots/castle.png) | ![Lumen Row village approach among castle walls and forest](docs/screenshots/village.png) |

| 3 · Mirror Mere | 4 · The Thorn Veil |
| --- | --- |
| ![Mirror Mere moonlit shoreline and glowing wisps](docs/screenshots/lake.png) | ![The Thorn Veil procedural forest with fireflies](docs/screenshots/forest.png) |

| 5 · Astral Spire | 6 · Moving Stair |
| --- | --- |
| ![Astral Spire upper observatory and floating candles](docs/screenshots/tower.png) | ![Moving Stair courtyard connection study](docs/screenshots/courtyard-stair.png) |

| 7 · Aerial Survey | 8 · The Great Hall |
| --- | --- |
| ![Aerial survey showing the deterministic world zoning overview](docs/screenshots/aerial.png) | ![The Great Hall interior with floating candles, long tables, banners, and a dais](docs/screenshots/great-hall.png) |

| 9 · Veilcross Waiting Hall | 10 · Veyra Archive |
| --- | --- |
| ![Veilcross waiting hall at night with the glowing departure board and a resident traveller](docs/screenshots/station-hall.png) | ![Veyra Archive library at night with seeded bookcases, floating volumes, and the archive researcher](docs/screenshots/library-hall.png) |

### Daylight

| 1 · Castle of Veyra | 2 · Lumen Row |
| --- | --- |
| ![Castle of Veyra in daylight with gothic towers, battlements, and surrounding forest](docs/screenshots/castle-day.png) | ![Lumen Row village and road in daylight beneath the castle](docs/screenshots/village-day.png) |

| 3 · Mirror Mere | 4 · The Thorn Veil |
| --- | --- |
| ![Mirror Mere shoreline, reeds, rocks, and castle view in daylight](docs/screenshots/lake-day.png) | ![The Thorn Veil procedural forest and layered tree canopies in daylight](docs/screenshots/forest-day.png) |

| 5 · Astral Spire | 6 · Moving Stair |
| --- | --- |
| ![Astral Spire observatory and floating candles in daylight](docs/screenshots/tower-day.png) | ![Moving Stair courtyard and castle connections in daylight](docs/screenshots/courtyard-stair-day.png) |

| 7 · Aerial Survey | 8 · The Great Hall |
| --- | --- |
| ![Aerial daylight survey of the complete deterministic world](docs/screenshots/aerial-day.png) | ![The Great Hall daylight interior with sunlit walls, tables, banners, and floating candles](docs/screenshots/great-hall-day.png) |

| 9 · Veilcross Waiting Hall | 10 · Veyra Archive |
| --- | --- |
| ![Veilcross waiting hall in daylight with the departure board, tall windows, and a resident traveller](docs/screenshots/station-hall-day.png) | ![Veyra Archive library in daylight with seeded bookcases, floating volumes, and the archive researcher](docs/screenshots/library-hall-day.png) |

---

## Explore

- `T` — cinematic tour
- `G` — grounded walk; click the world, then use `WASD` and `Shift`
- `F` — free fly; click the world, then use `WASD`, `Q`/`E`, and `Shift`
- `O` — orbit; drag to rotate and scroll to zoom
- `A` — start or stop automatic orbit rotation
- `R` — generate a new seed
- `Esc` — release the pointer in Walk or Free Fly mode
- `Space` — pause or resume the cinematic tour
- `1`–`8` — jump to Castle, Village, Lake, Forest, Tower, Mountains, Ruins, or Station
- `9` / `0` — open the Courtyard Stair or Aerial fixed view
- `H` — enter the seeded Great Hall interior
- `I` — enter Veilcross Station's seeded waiting hall
- `L` — enter the seeded Veyra Archive library
- `M` — enable or mute the procedural soundscape
- `N` — switch between day and night

Walk mode keeps the camera at eye height over procedural terrain and applies collision against world bounds, the lake, castle towers, hall and gatehouse, and every rotated village footprint. Blocked diagonal movement attempts an axis slide so the player can move naturally along walls. Orbit mode supports mouse drag and wheel zoom on desktop, plus one-finger drag and two-finger pinch zoom on touch screens. It focuses on the most recently presented landmark instead of jumping to a fixed world center. Automatic rotation pauses while dragging and resumes on release; manual zoom remains available throughout.

`Enter realm` starts the experience, collapses the landing panel, and parks the camera on the castle. Use `Resume` or `Space` to begin the tour. The scene switcher provides direct buttons for eight world landmarks plus the courtyard staircase, aerial survey, Great Hall, Veilcross waiting hall, and Veyra Archive library fixed views. Every transition stops at its destination until the tour is explicitly resumed. Inside Veilcross, decode the board, ask Clerk Elyra, claim a passage stamp, travel to the seed-selected landmark, and complete the local delivery. The tracker remains visible after leaving the station.

The same seed always recreates the same world. The HUD reports live frame rate and frame time, draw calls, triangles, GPU resource ownership, generation time, optional JavaScript heap data, and resources released by the latest rebuild. Seed, Randomize, and quality controls lock while a build or rebuild audit is active, preventing overlapping UI mutations.

## Visual and environment controls

The Day/Night control transitions the complete lighting model: sky, fog, stars, celestial light, water highlights, fill light, exposure, bloom, and the optional procedural soundscape. Night mode combines a moon key light, shadow-free cool fill, lifted hemispheric ambience, a deeper seed-aware drone, and shallower fog so silhouettes retain detail without losing their moonlit mood. Sound remains muted until the user enables it.

The HUD includes Low, Medium, and High quality tiers, atmospheric fog, a master post-processing switch, independent color grade, HDR Bloom and vignette controls, FXAA, optional SSAO on Medium/High, dynamic shadows, zone diagnostics, reduced motion, ambient animation, and distance streaming. Fog density, Bloom strength, and water motion are adjustable live. High quality supports 1,100 instanced trees, while deterministic near/far forest batches and five camera-aware streamed regions reduce distant geometry and shadow cost. The HUD reports active streamed zones in real time.

## Local development

```bash
npm install
npm run dev
```

Create a production build with `npm run build`. Run the deterministic regression suite with `npm test`, and run static checks with `npm run lint`.

## Implementation notes

The experience uses direct Three.js scene, camera, renderer, geometry, shader, instancing, and GPU lifecycle management. Dedicated camera, collision, and environment systems own input listeners, tour/walk/fly/orbit transitions, grounded movement, day/night lighting, sky, fog, stars, celestial objects, water highlights, exposure, bloom, and shadow state through explicit update and disposal lifecycles.

Terrain, castle stone, slate roofs, tree trunks, and village timber use seed-aware world-space procedural materials. Animated arcane wisps run entirely in a GPU point shader. The lake, shoreline rocks, reeds, and island share one deterministic boundary; its shader provides analytic waves, depth-to-shore color, Fresnel response, celestial highlights, and shoreline foam.

Generator `1.8.0` adds a rendered gatehouse with an arched portal, instanced castle buttresses and battlements, seeded village chimneys, framed windows and hanging signs, plus leaning trunks and two-tier near-tree canopies. Detail profiles use isolated seed namespaces so silhouette changes do not cascade into unrelated systems. Village windows and trim are instanced in shared batches to keep added draw-call cost bounded.

Generator `1.9.0` replaces the solid Great Hall mass with a hollow architectural shell while preserving its exterior roofline. Scene `8` presents a seeded interior with long tables, benches, dais, lectern, banners, glowing windows, rafters, twenty-four floating candles, and a bounded warm candle-light rig for readable night interiors. Repeated seeds reproduce the same candle layout. Fourteen tower windows now share one instanced batch, preserving the façade while bringing the complete 1080p castle view below the original draw-call ceiling.

Generator `2.0.0` adds a seeded visual-embellishment layer without changing the established world topology. The castle gains a library wing, balcony, courtyard arcade, supported bridge silhouette, and a distinct metal observatory roof. Lumen Row gains a tavern, shop, market square, fountain, lamps, fencing, and cobbled alleys. The Thorn Veil gains exposed roots, fallen timber, mushrooms, a waystone ruin, and localized mist. Procedural cloud banks, four world-rune sites, orbiting books, and traveling lanterns animate across the wider scene. New seeded metal and transmissive leaded-glass materials are shared across these additions, and the largest repeated details remain instanced by quality tier.

Generator `2.1.0` promotes the remaining planned regions into first-class world regions. The seeded Umbravale Range forms a layered northern skyline and monumental pass; Orison Ruins provides a complete column circle, standing arches, rubble field, dais, and glass memory monolith; Veilcross Station includes a terminal hall, clock tower, platform, rails, sleepers, glass canopy, and moving arcane railcar. All three regions have manifest zones, cinematic-tour destinations, direct scene controls, quality-scaled instancing, and grounded collision ownership where appropriate.

Generator `2.2.0` converts Veilcross Station's solid terminal mass into the project's second enterable interior. The waiting hall preserves the exterior silhouette while adding a hollow shell, timber floor, ticket counter and windows, six benches, a seeded luggage layout, departure glyph board, rafters, hanging lanterns, and bounded warm lighting. Named clerk, conductor, and departure-quest anchors establish stable mounting points for later gameplay. A direct `I` shortcut and seed-linked sealed-notice interaction make the space explorable before the full NPC and quest systems arrive.

Generator `2.3.0` populates those anchors with procedural Clerk Elyra and conductor figures, each carrying explicit interaction metadata and a luminous quest marker. The waiting-hall panel now forms a finite three-action quest: decode the board, speak with the clerk, and claim the correct passage stamp. Destination, notice, request, and reward are selected deterministically from the active world seed; rebuilding from another seed resets the quest without stale state leaking across worlds.

Generator `2.4.0` adds an original Web Audio soundscape generated entirely at runtime. Each seed controls the low drone, harmonic overtone, and filtered wind bed; day and night shift frequency, brightness, and master level without restarting the audio graph. The three Veilcross quest actions produce progressively richer synthesized chimes. Audio is opt-in through the top-bar `Sound` control or `M`, follows world rebuilds, and owns an explicit cleanup lifecycle.

Generator `2.5.0` adds camera-distance world streaming for five independently owned detail regions: castle embellishments, village embellishments, Umbravale, Orison Ruins, and Veilcross Station. Quality tiers define activation and release distances, with hysteresis preventing boundary flicker. Aerial surveys and high-altitude flight force every region visible, while disabling the HUD toggle restores the complete scene immediately. Core terrain, primary architecture, water, forest, and ambience remain continuously available.

Generator `2.6.0` gives the station characters deterministic ambient behavior. Clerk Elyra performs subtle work gestures while her quest badge pulses; the conductor follows a bounded patrol around the waiting-hall entrance with seeded pace, phase, and route width. Ambient pause freezes both characters naturally, reduced-motion mode restores stable base poses, and every world rebuild rebinds the behavior system without retaining stale scene references.

Generator `2.7.0` extends the Veilcross micro-quest into a cross-region courier route. After receiving the passage stamp, the persistent tracker sends the player to Umbravale, Orison Ruins, or Lumen Row according to the active seed, switches to that landmark through the established camera system, and presents a location-specific final delivery. The finite six-state machine prevents skipped or repeated transitions, and each journey stage has a distinct synthesized cue.

Generator `2.8.0` converts the Veyra Archive library wing into the project's third enterable interior. Its hollow shell contains seeded bookcases and books, reading desks, a leaded-glass skylight, floating volumes, a central archive table, a luminous memory orb, bounded interior lighting, and a stable researcher anchor for future interaction. The exterior roof, windows, and balcony remain intact, while the direct `L` shortcut and fixed scene view provide immediate access.

Generator `2.9.0` populates the wider world with a deterministic resident cast. Sixteen seeded placements span the castle, Lumen Row, the Thorn Veil, Mirror Mere, Umbravale, Orison Ruins, Veilcross Station, and the Veyra Archive, and the active quality tier admits eight, twelve, or sixteen of them. Every figure shares five instanced batches — cloak, head, hat brim, hat crown, and staff — so the whole cast costs five draw calls regardless of headcount. Seeded pace, phase, stride, and facing drive low-cost breathing, turning, and short patrol motion, while named anchors carry role, region, and label metadata for later interaction. Ambient pause and reduced motion restore the stable base pose, and every rebuild rebinds the system without retaining stale scene references. The wayfinder lantern housings also moved off the shared metal shader onto a dedicated warm-bronze material, so a lantern drifting close to the camera reads as a lit fixture instead of an unlit silhouette.

Regeneration uses an atomic, latest-request-wins pipeline. World construction is split into deterministic chunks that yield after a browser paint opportunity, so the active world keeps rendering and superseded tickets can be canceled through `AbortController` while generation is still in progress. Partially built roots own their resources from the first cancellable boundary and dispose them automatically on cancellation. A new world is fully constructed and validated before it replaces the active root. Shared resources are deduplicated through an idempotent registry before disposal. Failed generation leaves the existing world visible, while WebGL context restoration triggers a validated rebuild. The `20× rebuild audit` tracks GPU geometry and browser heap samples when heap telemetry is available. The latest coordinator validation held `114→114` geometries, and forcing collection after the run returns the heap to 24 MB against a 25 MB pre-audit baseline.

The castle manifest is a connected topology of towers, hall, courtyard, gate, corridors, bridges, and a moving-stair route. Village placement validates road setback, zone membership, castle/lake exclusion, terrain slope, unique IDs, and footprint separation. The cinematic camera follows seed-aware Catmull–Rom curves through five terrain-safe landmarks, with every segment checked across twenty regression seeds.

No third-party models, textures, characters, names, or franchise assets are included. All architecture, terrain, water, vegetation, village structures, and ambience are generated at runtime.

## Scope

This repository contains the complete original vertical slice plus grounded collision navigation, three enterable interiors, two animated station characters, the first complete deterministic cross-region quest, an original procedural soundscape, camera-distance region streaming, and a deterministic world-wide resident cast spanning all eight regions.

## License

[MIT](LICENSE)
