# The Nocturne Atlas / 夜曲輿圖

[English](#english) · [繁體中文](#繁體中文)

An original, seed-driven 3D wizarding world built with Three.js and TypeScript.

使用 Three.js 與 TypeScript 打造的原創種子驅動 3D 魔法世界。

## Scene Gallery / 場景圖庫

The paired night and daylight galleries were captured from the deterministic `MAGIC-001` world with generator `1.9.0` at Medium quality. All sixteen images are actual scene-switch destinations with the tour paused after arrival, including the seeded Great Hall interior.

夜間與白天兩組圖庫均擷取自固定種子 `MAGIC-001`、生成器 `1.9.0` 與中等畫質。十六張圖片都是實際可切換的場景目的地，抵達後導覽會保持暫停，並包含種子化城堡大廳室內場景。

### Night / 夜晚

| 1 · Castle of Veyra / 維拉城堡 | 2 · Lumen Row / 流明街村莊 |
| --- | --- |
| ![Castle of Veyra scene with gothic towers and floating candles](docs/screenshots/castle.png) | ![Lumen Row village approach among castle walls and forest](docs/screenshots/village.png) |

| 3 · Mirror Mere / 鏡月湖 | 4 · The Thorn Veil / 荊棘帷幕森林 |
| --- | --- |
| ![Mirror Mere moonlit shoreline and glowing wisps](docs/screenshots/lake.png) | ![The Thorn Veil procedural forest with fireflies](docs/screenshots/forest.png) |

| 5 · Astral Spire / 星界尖塔 | 6 · Moving Stair / 移動階梯中庭 |
| --- | --- |
| ![Astral Spire upper observatory and floating candles](docs/screenshots/tower.png) | ![Moving Stair courtyard connection study](docs/screenshots/courtyard-stair.png) |

| 7 · Aerial Survey / 空中勘察 | 8 · The Great Hall / 城堡大廳 |
| --- | --- |
| ![Aerial survey showing the deterministic world zoning overview](docs/screenshots/aerial.png) | ![The Great Hall interior with floating candles, long tables, banners, and a dais](docs/screenshots/great-hall.png) |

### Daylight / 白天

| 1 · Castle of Veyra / 維拉城堡 | 2 · Lumen Row / 流明街村莊 |
| --- | --- |
| ![Castle of Veyra in daylight with gothic towers, battlements, and surrounding forest](docs/screenshots/castle-day.png) | ![Lumen Row village and road in daylight beneath the castle](docs/screenshots/village-day.png) |

| 3 · Mirror Mere / 鏡月湖 | 4 · The Thorn Veil / 荊棘帷幕森林 |
| --- | --- |
| ![Mirror Mere shoreline, reeds, rocks, and castle view in daylight](docs/screenshots/lake-day.png) | ![The Thorn Veil procedural forest and layered tree canopies in daylight](docs/screenshots/forest-day.png) |

| 5 · Astral Spire / 星界尖塔 | 6 · Moving Stair / 移動階梯中庭 |
| --- | --- |
| ![Astral Spire observatory and floating candles in daylight](docs/screenshots/tower-day.png) | ![Moving Stair courtyard and castle connections in daylight](docs/screenshots/courtyard-stair-day.png) |

| 7 · Aerial Survey / 空中勘察 | 8 · The Great Hall / 城堡大廳 |
| --- | --- |
| ![Aerial daylight survey of the complete deterministic world](docs/screenshots/aerial-day.png) | ![The Great Hall daylight interior with sunlit walls, tables, banners, and floating candles](docs/screenshots/great-hall-day.png) |

---

## English

### Explore

- `T` — cinematic tour
- `G` — grounded walk; click the world, then use `WASD` and `Shift`
- `F` — free fly; click the world, then use `WASD`, `Q`/`E`, and `Shift`
- `O` — orbit; drag to rotate and scroll to zoom
- `A` — start or stop automatic orbit rotation
- `R` — generate a new seed
- `Esc` — release the pointer in Walk or Free Fly mode
- `Space` — pause or resume the cinematic tour
- `1`–`5` — jump to Castle, Village, Lake, Forest, or Tower
- `6` / `7` — open the Courtyard Stair or Aerial fixed view
- `8` — enter the seeded Great Hall interior
- `N` — switch between day and night

Walk mode keeps the camera at eye height over procedural terrain and applies collision against world bounds, the lake, castle towers, hall and gatehouse, and every rotated village footprint. Blocked diagonal movement attempts an axis slide so the player can move naturally along walls. Orbit mode supports mouse drag and wheel zoom on desktop, plus one-finger drag and two-finger pinch zoom on touch screens. It focuses on the most recently presented landmark instead of jumping to a fixed world center. Automatic rotation pauses while dragging and resumes on release; manual zoom remains available throughout.

`Enter realm` starts the experience, collapses the landing panel, and parks the camera on the castle. Use `Resume` or `Space` to begin the tour. The scene switcher provides direct buttons for the castle, village, lake, forest, tower, courtyard staircase, aerial survey, and Great Hall. Every transition stops at its destination until the tour is explicitly resumed.

The same seed always recreates the same world. The HUD reports live frame rate and frame time, draw calls, triangles, GPU resource ownership, generation time, optional JavaScript heap data, and resources released by the latest rebuild. Seed, Randomize, and quality controls lock while a build or rebuild audit is active, preventing overlapping UI mutations.

### Visual and environment controls

The Day/Night control transitions the complete lighting model: sky, fog, stars, celestial light, water highlights, fill light, exposure, and bloom. Night mode combines a moon key light, shadow-free cool fill, lifted hemispheric ambience, and shallower fog so silhouettes retain detail without losing their moonlit mood.

The HUD includes Low, Medium, and High quality tiers, atmospheric fog, a master post-processing switch, independent color grade, HDR Bloom and vignette controls, FXAA, optional SSAO on Medium/High, dynamic shadows, zone diagnostics, reduced motion, and a unified ambient-animation switch. Fog density, Bloom strength, and water motion are adjustable live. High quality supports 1,100 instanced trees, while deterministic near/far forest batches reduce distant geometry and shadow cost.

### Local development

```bash
npm install
npm run dev
```

Create a production build with `npm run build`. Run the deterministic regression suite with `npm test`, and run static checks with `npm run lint`.

### Validation evidence

- All eight fixed destinations were browser-checked in both night and daylight modes and recaptured from generator `1.9.0` at 1280×720, producing sixteen gallery images.
- Village, Forest, Tower, and Moving Stair cameras satisfy presentation-clearance contracts across twenty regression seeds.
- Day/night transition, automatic orbit, mouse drag, and wheel zoom were exercised in the local WebGL experience. Touch input shares the tested orbit constraints and adds one-finger drag plus two-finger pinch.
- All 37 deterministic, lifecycle, shader, environment, collision, camera, interior, rebuild-coordination, and presentation tests pass. Coverage includes latest-request-wins coalescing and cancellation, deterministic Great Hall furnishing, grounded movement, world/lake/castle/village collision, seeded detail profiles, night fill ownership, exposure, fog density, daylight transition, shadow toggles, landmark-relative orbit focus, drag-paused automatic rotation, and idempotent cleanup.
- Production build and lint complete without errors. The build currently reports a non-blocking warning for the Three.js client chunk exceeding 500 kB after minification.
- The generator `1.9.0` Medium-quality castle view reports 60 FPS, 189 draw calls, 66k triangles, 66 geometries, and 16 textures in the local Chromium/WebGL2 1920×1080 validation run. The Great Hall view reports 60 FPS, 129 draw calls, and 59k triangles. Cross-device FPS remains hardware-dependent.
- The settled `20× rebuild audit` completed cleanly at 1920×1080: geometries remained `66→66`, while the available browser heap sample settled from `38.5→39.2 MB` after a three-second post-rebuild observation window.

### Implementation notes

The experience uses direct Three.js scene, camera, renderer, geometry, shader, instancing, and GPU lifecycle management. Dedicated camera, collision, and environment systems own input listeners, tour/walk/fly/orbit transitions, grounded movement, day/night lighting, sky, fog, stars, celestial objects, water highlights, exposure, bloom, and shadow state through explicit update and disposal lifecycles.

Terrain, castle stone, slate roofs, tree trunks, and village timber use seed-aware world-space procedural materials. Animated arcane wisps run entirely in a GPU point shader. The lake, shoreline rocks, reeds, and island share one deterministic boundary; its shader provides analytic waves, depth-to-shore color, Fresnel response, celestial highlights, and shoreline foam.

Generator `1.8.0` adds a rendered gatehouse with an arched portal, instanced castle buttresses and battlements, seeded village chimneys, framed windows and hanging signs, plus leaning trunks and two-tier near-tree canopies. Detail profiles use isolated seed namespaces so silhouette changes do not cascade into unrelated systems. Village windows and trim are instanced in shared batches to keep added draw-call cost bounded.

Generator `1.9.0` replaces the solid Great Hall mass with a hollow architectural shell while preserving its exterior roofline. Scene `8` presents a seeded interior with long tables, benches, dais, lectern, banners, glowing windows, rafters, twenty-four floating candles, and a bounded warm candle-light rig for readable night interiors. Repeated seeds reproduce the same candle layout. Fourteen tower windows now share one instanced batch, preserving the façade while bringing the complete 1080p castle view below the Phase 1 draw-call ceiling.

Regeneration uses an atomic, latest-request-wins pipeline: requests queued before the next render frame are coalesced, superseded tickets are canceled through `AbortController`, and cancellation is checked at safe generation boundaries. A new world is constructed and validated before it replaces the active root. Shared resources are deduplicated through an idempotent registry before disposal. Failed generation leaves the existing world visible, while WebGL context restoration triggers a validated rebuild. The `20× rebuild audit` tracks GPU geometry and browser heap samples when heap telemetry is available. The latest coordinator validation completed cleanly at `65→65` geometries with the available heap sample settling from `36.9→34.7 MB`.

The castle manifest is a connected topology of towers, hall, courtyard, gate, corridors, bridges, and a moving-stair route. Village placement validates road setback, zone membership, castle/lake exclusion, terrain slope, unique IDs, and footprint separation. The cinematic camera follows seed-aware Catmull–Rom curves through five terrain-safe landmarks, with every segment checked across twenty regression seeds.

No third-party models, textures, characters, names, or franchise assets are included. All architecture, terrain, water, vegetation, village structures, and ambience are generated at runtime.

### Scope

This repository contains the complete Phase 1 vertical slice plus grounded collision navigation and the first castle interior from Phase 2. Additional interiors, NPCs, quests, original audio, and world streaming remain planned follow-up work.

---

## 繁體中文

### 操作方式

- `T` — 電影式自動導覽
- `G` — 地面行走；點擊世界後使用 `WASD` 與 `Shift`
- `F` — 自由飛行；點擊世界後使用 `WASD`、`Q`/`E` 與 `Shift`
- `O` — 環繞視角；拖曳旋轉、滾輪縮放
- `A` — 開啟或停止自動環繞旋轉
- `R` — 產生新的隨機種子
- `Esc` — 在地面行走或自由飛行模式解除滑鼠鎖定
- `Space` — 暫停或繼續電影式導覽
- `1`–`5` — 直接切換至城堡、村莊、湖泊、森林或高塔
- `6` / `7` — 切換至中庭階梯或空中勘察固定視角
- `8` — 進入種子化城堡大廳室內場景
- `N` — 切換白天與夜晚

地面行走模式會讓鏡頭保持在程序地形上的視線高度，並對世界邊界、湖泊、城堡塔樓、大廳、城門，以及每棟旋轉過的村屋套用碰撞。斜向移動受阻時會嘗試沿單一軸向滑動，讓貼牆行走更自然。環繞模式在桌面支援滑鼠拖曳與滾輪縮放，在觸控裝置支援單指拖曳與雙指縮放。進入環繞模式時會以最近瀏覽的地標為中心，不會跳回固定的世界中心。拖曳期間自動旋轉會暫停，放開後自然恢復，過程中仍可隨時縮放。

按下 `Enter realm` 會進入世界、收合起始面板，並將鏡頭停在城堡。使用 `Resume` 或 `Space` 才會開始導覽。場景切換列提供城堡、村莊、湖泊、森林、高塔、中庭階梯、空中勘察與城堡大廳按鍵；每次轉場抵達後都會停住，直到使用者主動恢復導覽。

輸入相同種子一定會重建出相同世界。HUD 會顯示即時幀率、幀時間、Draw Calls、三角形數量、GPU 資源、生成時間、瀏覽器支援時的 JavaScript Heap，以及上一次重建所釋放的資源。世界建立或重建稽核進行時，Seed、Randomize 與畫質控制會暫時鎖定，避免 UI 操作重疊修改狀態。

### 畫面與環境控制

日夜按鍵會完整轉換天空、霧、星光、天體光源、水面高光、補光、曝光與 Bloom。夜間使用月光主光源、無陰影冷色補光、提高的半球環境光與較淺的霧，讓城堡與地形輪廓更清楚，同時保留月夜氛圍。

HUD 提供低、中、高三種實際畫質等級，以及大氣霧、後製總開關、可獨立切換的色彩分級、HDR Bloom 與 Vignette、FXAA、中高畫質 SSAO、動態陰影、區域診斷、減少動態效果和環境動畫總開關。霧密度、Bloom 強度與水面動態可即時調整。高畫質最多支援 1,100 棵實例化樹木；森林則使用固定種子的近／遠景批次，降低遠距幾何與陰影成本。

### 本機開發

```bash
npm install
npm run dev
```

使用 `npm run build` 建立正式版本，使用 `npm test` 執行固定種子回歸測試，使用 `npm run lint` 執行靜態檢查。

### 驗證結果

- 八個固定場景目的地皆已使用生成器 `1.9.0`，分別在夜間與白天模式以 1280×720 實際檢查並重新截圖，共產生十六張圖庫圖片。
- 村莊、森林、高塔與移動階梯鏡頭，在二十組回歸種子中皆符合取景淨空規則。
- 日夜切換、自動環繞、滑鼠拖曳與滾輪縮放已在本機 WebGL 場景操作驗證。觸控操作沿用相同環繞限制，並加入單指拖曳與雙指縮放。
- 37 項固定性、生命週期、Shader、環境、碰撞、鏡頭、室內、重建協調與場景呈現測試全數通過。涵蓋最新請求優先的合併與取消、固定種子大廳陳設、貼地移動、世界／湖泊／城堡／村莊碰撞、種子化細節設定、夜間補光管理、曝光、霧密度、日夜轉換、陰影切換、地標中心環繞、拖曳暫停自轉與重複清理安全性。
- 正式建置與 Lint 均無錯誤。目前僅有 Three.js 用戶端區塊壓縮後超過 500 kB 的非阻擋警告。
- 生成器 `1.9.0` 的中等畫質城堡視角，在本機 Chromium／WebGL2、1920×1080 驗證中為 60 FPS、189 Draw Calls、66k 三角形、66 個 Geometry 與 16 個 Texture；城堡大廳視角則為 60 FPS、129 Draw Calls 與 59k 三角形。不同裝置的 FPS 仍取決於實際硬體。
- 1920×1080 的 `20× rebuild audit` 已通過穩定驗證：Geometry 維持 `66→66`，瀏覽器可提供的 Heap 樣本在重建後三秒觀察窗中由 `38.5→39.2 MB`。

### 實作說明

本體直接使用 Three.js 管理場景、鏡頭、Renderer、幾何、Shader、Instancing 與 GPU 資源生命週期。獨立的鏡頭、碰撞與環境系統透過明確的更新及清理流程，管理輸入事件、導覽／地面行走／自由飛行／環繞切換、貼地移動、日夜照明、天空、霧、星光、天體、水面高光、曝光、Bloom 與陰影狀態。

地形、城堡石材、石板屋頂、樹幹與村莊木材均使用與種子相關的世界座標程序材質。魔法光點完全在 GPU Point Shader 中運作。湖泊、水岸岩石、蘆葦與島嶼共用同一條固定邊界；水面 Shader 提供解析波浪、深淺水色、Fresnel 反射、天體高光與岸邊泡沫。

生成器 `1.8.0` 新增具有拱門入口的城門建築、實例化城堡扶壁與垛口、種子化村莊煙囪、窗框與懸掛招牌，以及傾斜樹幹和近景雙層樹冠。細節設定使用隔離的種子命名空間，輪廓變化不會連帶改變其他系統。村莊窗戶與飾條以共用 Instancing 批次繪製，使新增細節的 Draw Call 成本維持受控。

生成器 `1.9.0` 將原本實心的城堡大廳改為中空建築外殼，同時保留外部屋頂輪廓。場景 `8` 會呈現具有長桌、長椅、講台、旗幟、發光窗戶、屋樑、二十四根漂浮蠟燭，以及範圍受限的暖色燭光補光；相同種子會重現相同的蠟燭配置。十四扇塔樓窗戶現在共用單一 InstancedMesh 批次，在維持立面外觀的同時，讓完整 1080p 城堡視角低於 Phase 1 的 Draw Call 上限。

世界重建採用原子化、最新請求優先的流程：下一個 Render Frame 前收到的請求會合併，已被取代的 Ticket 透過 `AbortController` 取消，並在安全的生成邊界檢查取消狀態。新世界完成建立與驗證後才取代目前場景；共用資源由可重複安全清理的 Registry 去重並釋放。生成失敗時舊世界仍可使用；WebGL Context 恢復後則會觸發已驗證的重建流程。`20× rebuild audit` 會記錄 GPU Geometry，以及瀏覽器提供 Heap Telemetry 時的記憶體樣本。最新一次協調器驗證維持 `65→65` 個 Geometry，Heap 樣本由 `36.9→34.7 MB`。

城堡 Manifest 是由塔樓、大廳、中庭、城門、走廊、橋梁與移動階梯路線組成的連通拓撲。村莊配置會驗證道路退縮、區域範圍、城堡與湖泊排除、地形坡度、唯一 ID 與建築間距。電影式鏡頭使用與種子相關的 Catmull–Rom 曲線穿過五個地形安全地標，並以二十組回歸種子檢查每個曲線區段。

專案沒有使用任何第三方模型、貼圖、角色、名稱或系列作品資產。建築、地形、水體、植被、村莊與環境效果都在執行時生成。

### 專案範圍

目前版本包含完成度完整的 Phase 1 垂直切片，以及 Phase 2 的地面碰撞導航與第一個城堡室內場景。更多室內空間、NPC、任務、原創音效與世界串流仍屬後續階段規劃。
