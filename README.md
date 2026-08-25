# The Nocturne Atlas

An original, seed-driven 3D wizarding world built with Three.js and TypeScript. A seed deterministically shapes the terrain, castle proportions, village, lake, forest, floating lights, and cinematic composition.

## Explore

- `T` — cinematic tour
- `F` — free fly; click the world, then use `WASD`, `Q`/`E`, and `Shift`
- `O` — orbit; drag to rotate and scroll to zoom
- `R` — generate a new seed
- `Esc` — release the pointer in free-fly mode
- `Space` — pause or resume the cinematic tour

The seed panel accepts any text. Re-entering the same seed recreates the same world. The HUD shows live frame rate, draw calls, triangle count, GPU geometry/texture ownership, generation time, and the resources released by the last rebuild.

`Enter realm` starts the immersive experience and collapses the landing copy and seed panel. After entering, use the `Seed` control in the top bar to reopen the panel; its primary action then becomes `Rebuild realm`.

The HUD also exposes real Low, Medium, and High quality tiers, atmospheric fog, HDR Bloom/cinematic grading, zone-boundary diagnostics, a unified ambient-animation switch, and the deterministic world manifest. Quality tiers change render scale, Bloom strength, and instance density rather than acting as labels only. The `20× rebuild audit` repeatedly performs atomic swaps and reports the live GPU geometry delta; a clean result allows a one-geometry tolerance for Three.js renderer housekeeping.

## Local development

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

Run the deterministic regression suite with `npm test`. It checks manifest repeatability, forked seed streams, twenty fixed seeds, castle-graph connectivity, dangling routes, finite terrain samples, and the ban on `Math.random()` inside generation code.

## Implementation notes

The experience uses direct Three.js scene, camera, renderer, geometry, shader, instancing, and GPU resource lifecycle management. It contains no third-party models, textures, characters, names, or franchise assets. The procedural water, architecture, vegetation, village, and ambience are generated at runtime.

Terrain, castle stone, slate roofs, tree trunks, and village timber use seed-aware world-space procedural materials. Animated arcane wisps run entirely in a GPU point shader with per-point phases; no image textures or per-particle CPU updates are required.

The lake, shoreline rocks, reeds, and island share a single deterministic boundary. The water shader includes analytic waves, depth-to-shore color, Fresnel response, moon highlights, and a restrained shoreline foam band. Water motion is adjustable live from the HUD, while shore ecology density follows the selected quality tier.

World regeneration uses an atomic swap: a new world is constructed and validated before replacing the active root. If generation fails, the existing world remains visible and usable.

The castle manifest is a connected topology of towers, hall, courtyard, gate, corridors, bridges, and one moving-stair route. Runtime validation rejects missing endpoints, disconnected nodes, unsafe camera landmarks, invalid zone boundaries, or mismatched procedural counts. The staircase rotates between two physical landing platforms with quaternion interpolation.

The cinematic camera follows seed-aware Catmull–Rom position and look-target curves through five terrain-safe landmarks: castle, village, lake, forest, and tower detail. Returning from Free Fly or Orbit uses a smooth handoff from the current view. A reduced-motion option slows the tour and lengthens the handoff.

This is a polished Phase 1 vertical slice. Collision, interiors, NPCs, quests, audio, and world streaming are intentionally outside its scope.
