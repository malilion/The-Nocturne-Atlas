# The Nocturne Atlas

An original, seed-driven 3D wizarding world built with Three.js and TypeScript. A seed deterministically shapes the terrain, castle proportions, village, lake, forest, floating lights, and cinematic composition.

## Explore

- `T` — cinematic tour
- `F` — free fly; click the world, then use `WASD`, `Q`/`E`, and `Shift`
- `O` — orbit; drag to rotate and scroll to zoom
- `R` — generate a new seed
- `Esc` — release the pointer in free-fly mode

The seed panel accepts any text. Re-entering the same seed recreates the same world. The HUD shows live frame rate, draw calls, and triangle count.

## Local development

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## Implementation notes

The experience uses direct Three.js scene, camera, renderer, geometry, shader, instancing, and GPU resource lifecycle management. It contains no third-party models, textures, characters, names, or franchise assets. The procedural water, architecture, vegetation, village, and ambience are generated at runtime.

This is a polished Phase 1 vertical slice. Collision, interiors, NPCs, quests, audio, and world streaming are intentionally outside its scope.
