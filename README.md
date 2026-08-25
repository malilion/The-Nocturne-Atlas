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

### Visual and environment controls

The Day/Night control transitions the complete lighting model: sky, fog, stars, celestial light, water highlights, fill light, exposure, bloom, and the optional procedural soundscape. Night mode combines a moon key light, shadow-free cool fill, lifted hemispheric ambience, a deeper seed-aware drone, and shallower fog so silhouettes retain detail without losing their moonlit mood. Sound remains muted until the user enables it.

The HUD includes Low, Medium, and High quality tiers, atmospheric fog, a master post-processing switch, independent color grade, HDR Bloom and vignette controls, FXAA, optional SSAO on Medium/High, dynamic shadows, zone diagnostics, reduced motion, ambient animation, and distance streaming. Fog density, Bloom strength, and water motion are adjustable live. High quality supports 1,100 instanced trees, while deterministic near/far forest batches and five camera-aware streamed regions reduce distant geometry and shadow cost. The HUD reports active streamed zones in real time.

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
- All 62 deterministic, lifecycle, shader, audio, environment, streaming, NPC-motion, collision, camera, interior, region-topology, quest-state, embellishment, incremental-generation, rebuild-coordination, and presentation tests pass. Coverage includes cooperative chunk scheduling, mid-build cancellation and cleanup, cross-region quest transitions and landmark mapping, deterministic NPC patrol profiles, reduced-motion pose restoration, camera-distance activation, streaming hysteresis and aerial overrides, seed/day-aware audio profiles, progressive quest cues, seeded mountains/ruins/station generation, seeded visual embellishments and quality scaling, metal/glass shader behavior, latest-request-wins coalescing, deterministic Great Hall, Veilcross, and Veyra Archive furnishing, NPC/quest attachment contracts, grounded movement, world/lake/castle/village/landmark collision, seeded detail profiles, night fill ownership, exposure, fog density, daylight transition, shadow toggles, landmark-relative orbit focus, drag-paused automatic rotation, and idempotent cleanup.
- Production build and lint complete without errors. The build currently reports a non-blocking warning for the Three.js client chunk exceeding 500 kB after minification.
- The generator `1.9.0` Medium-quality castle view reports 60 FPS, 189 draw calls, 66k triangles, 66 geometries, and 16 textures in the local Chromium/WebGL2 1920×1080 validation run. The Great Hall view reports 60 FPS, 129 draw calls, and 59k triangles. Cross-device FPS remains hardware-dependent.
- The settled `20× rebuild audit` completed cleanly at 1920×1080: geometries remained `66→66`, while the available browser heap sample settled from `38.5→39.2 MB` after a three-second post-rebuild observation window.

### Implementation notes

The experience uses direct Three.js scene, camera, renderer, geometry, shader, instancing, and GPU lifecycle management. Dedicated camera, collision, and environment systems own input listeners, tour/walk/fly/orbit transitions, grounded movement, day/night lighting, sky, fog, stars, celestial objects, water highlights, exposure, bloom, and shadow state through explicit update and disposal lifecycles.

Terrain, castle stone, slate roofs, tree trunks, and village timber use seed-aware world-space procedural materials. Animated arcane wisps run entirely in a GPU point shader. The lake, shoreline rocks, reeds, and island share one deterministic boundary; its shader provides analytic waves, depth-to-shore color, Fresnel response, celestial highlights, and shoreline foam.

Generator `1.8.0` adds a rendered gatehouse with an arched portal, instanced castle buttresses and battlements, seeded village chimneys, framed windows and hanging signs, plus leaning trunks and two-tier near-tree canopies. Detail profiles use isolated seed namespaces so silhouette changes do not cascade into unrelated systems. Village windows and trim are instanced in shared batches to keep added draw-call cost bounded.

Generator `1.9.0` replaces the solid Great Hall mass with a hollow architectural shell while preserving its exterior roofline. Scene `8` presents a seeded interior with long tables, benches, dais, lectern, banners, glowing windows, rafters, twenty-four floating candles, and a bounded warm candle-light rig for readable night interiors. Repeated seeds reproduce the same candle layout. Fourteen tower windows now share one instanced batch, preserving the façade while bringing the complete 1080p castle view below the Phase 1 draw-call ceiling.

Generator `2.0.0` adds a seeded visual-embellishment layer without changing the established world topology. The castle gains a library wing, balcony, courtyard arcade, supported bridge silhouette, and a distinct metal observatory roof. Lumen Row gains a tavern, shop, market square, fountain, lamps, fencing, and cobbled alleys. The Thorn Veil gains exposed roots, fallen timber, mushrooms, a waystone ruin, and localized mist. Procedural cloud banks, four world-rune sites, orbiting books, and traveling lanterns animate across the wider scene. New seeded metal and transmissive leaded-glass materials are shared across these additions, and the largest repeated details remain instanced by quality tier.

Generator `2.1.0` promotes the remaining PRD placeholders into first-class world regions. The seeded Umbravale Range forms a layered northern skyline and monumental pass; Orison Ruins provides a complete column circle, standing arches, rubble field, dais, and glass memory monolith; Veilcross Station includes a terminal hall, clock tower, platform, rails, sleepers, glass canopy, and moving arcane railcar. All three regions have manifest zones, cinematic-tour destinations, direct scene controls, quality-scaled instancing, and grounded collision ownership where appropriate.

Generator `2.2.0` converts Veilcross Station's solid terminal mass into the project's second enterable interior. The waiting hall preserves the exterior silhouette while adding a hollow shell, timber floor, ticket counter and windows, six benches, a seeded luggage layout, departure glyph board, rafters, hanging lanterns, and bounded warm lighting. Named clerk, conductor, and departure-quest anchors establish stable mounting points for later gameplay. A direct `I` shortcut and seed-linked sealed-notice interaction make the space explorable before the full NPC and quest systems arrive.

Generator `2.3.0` populates those anchors with procedural Clerk Elyra and conductor figures, each carrying explicit interaction metadata and a luminous quest marker. The waiting-hall panel now forms a finite three-action quest: decode the board, speak with the clerk, and claim the correct passage stamp. Destination, notice, request, and reward are selected deterministically from the active world seed; rebuilding from another seed resets the quest without stale state leaking across worlds.

Generator `2.4.0` adds an original Web Audio soundscape generated entirely at runtime. Each seed controls the low drone, harmonic overtone, and filtered wind bed; day and night shift frequency, brightness, and master level without restarting the audio graph. The three Veilcross quest actions produce progressively richer synthesized chimes. Audio is opt-in through the top-bar `Sound` control or `M`, follows world rebuilds, and owns an explicit cleanup lifecycle.

Generator `2.5.0` adds camera-distance world streaming for five independently owned detail regions: castle embellishments, village embellishments, Umbravale, Orison Ruins, and Veilcross Station. Quality tiers define activation and release distances, with hysteresis preventing boundary flicker. Aerial surveys and high-altitude flight force every region visible, while disabling the HUD toggle restores the complete scene immediately. Core terrain, primary architecture, water, forest, and ambience remain continuously available.

Generator `2.6.0` gives the station characters deterministic ambient behavior. Clerk Elyra performs subtle work gestures while her quest badge pulses; the conductor follows a bounded patrol around the waiting-hall entrance with seeded pace, phase, and route width. Ambient pause freezes both characters naturally, reduced-motion mode restores stable base poses, and every world rebuild rebinds the behavior system without retaining stale scene references.

Generator `2.7.0` extends the Veilcross micro-quest into a cross-region courier route. After receiving the passage stamp, the persistent tracker sends the player to Umbravale, Orison Ruins, or Lumen Row according to the active seed, switches to that landmark through the established camera system, and presents a location-specific final delivery. The finite six-state machine prevents skipped or repeated transitions, and each journey stage has a distinct synthesized cue.

Generator `2.8.0` converts the Veyra Archive library wing into the project's third enterable interior. Its hollow shell contains seeded bookcases and books, reading desks, a leaded-glass skylight, floating volumes, a central archive table, a luminous memory orb, bounded interior lighting, and a stable researcher anchor for future interaction. The exterior roof, windows, and balcony remain intact, while the direct `L` shortcut and fixed scene view provide immediate access.

Regeneration uses an atomic, latest-request-wins pipeline. World construction is split into deterministic chunks that yield after a browser paint opportunity, so the active world keeps rendering and superseded tickets can be canceled through `AbortController` while generation is still in progress. Partially built roots own their resources from the first cancellable boundary and dispose them automatically on cancellation. A new world is fully constructed and validated before it replaces the active root. Shared resources are deduplicated through an idempotent registry before disposal. Failed generation leaves the existing world visible, while WebGL context restoration triggers a validated rebuild. The `20× rebuild audit` tracks GPU geometry and browser heap samples when heap telemetry is available. The latest coordinator validation completed cleanly at `65→65` geometries with the available heap sample settling from `36.9→34.7 MB`.

The castle manifest is a connected topology of towers, hall, courtyard, gate, corridors, bridges, and a moving-stair route. Village placement validates road setback, zone membership, castle/lake exclusion, terrain slope, unique IDs, and footprint separation. The cinematic camera follows seed-aware Catmull–Rom curves through five terrain-safe landmarks, with every segment checked across twenty regression seeds.

No third-party models, textures, characters, names, or franchise assets are included. All architecture, terrain, water, vegetation, village structures, and ambience are generated at runtime.

### Scope

This repository contains the complete Phase 1 vertical slice plus grounded collision navigation, three enterable Phase 2 interiors, two animated station characters, the first complete deterministic cross-region quest, an original procedural soundscape, and camera-distance region streaming. A broader world NPC population remains planned follow-up work.

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
- `1`–`8` — 直接切換至城堡、村莊、湖泊、森林、高塔、山脈、遺跡或車站
- `9` / `0` — 切換至中庭階梯或空中勘察固定視角
- `H` — 進入種子化城堡大廳室內場景
- `I` — 進入霧岔車站的種子化候車大廳
- `L` — 進入種子化 Veyra Archive 圖書館
- `M` — 開啟或靜音程序化聲景
- `N` — 切換白天與夜晚

地面行走模式會讓鏡頭保持在程序地形上的視線高度，並對世界邊界、湖泊、城堡塔樓、大廳、城門，以及每棟旋轉過的村屋套用碰撞。斜向移動受阻時會嘗試沿單一軸向滑動，讓貼牆行走更自然。環繞模式在桌面支援滑鼠拖曳與滾輪縮放，在觸控裝置支援單指拖曳與雙指縮放。進入環繞模式時會以最近瀏覽的地標為中心，不會跳回固定的世界中心。拖曳期間自動旋轉會暫停，放開後自然恢復，過程中仍可隨時縮放。

按下 `Enter realm` 會進入世界、收合起始面板，並將鏡頭停在城堡。使用 `Resume` 或 `Space` 才會開始導覽。場景切換列提供八個世界地標，以及中庭階梯、空中勘察、城堡大廳、霧岔候車廳與 Veyra Archive 圖書館固定視角；每次轉場抵達後都會停住，直到使用者主動恢復導覽。在霧岔候車廳依序解讀班次板、詢問 Elyra、領取通行印記、前往種子指定地標並完成當地交付；離開車站後任務追蹤面板仍會持續顯示。

輸入相同種子一定會重建出相同世界。HUD 會顯示即時幀率、幀時間、Draw Calls、三角形數量、GPU 資源、生成時間、瀏覽器支援時的 JavaScript Heap，以及上一次重建所釋放的資源。世界建立或重建稽核進行時，Seed、Randomize 與畫質控制會暫時鎖定，避免 UI 操作重疊修改狀態。

### 畫面與環境控制

日夜按鍵會完整轉換天空、霧、星光、天體光源、水面高光、補光、曝光、Bloom 與選用的程序化聲景。夜間使用月光主光源、無陰影冷色補光、提高的半球環境光、較深沉的種子化低頻聲景與較淺的霧，讓城堡與地形輪廓更清楚，同時保留月夜氛圍。聲音預設靜音，必須由使用者主動開啟。

HUD 提供低、中、高三種實際畫質等級，以及大氣霧、後製總開關、可獨立切換的色彩分級、HDR Bloom 與 Vignette、FXAA、中高畫質 SSAO、動態陰影、區域診斷、減少動態效果、環境動畫與距離串流。霧密度、Bloom 強度與水面動態可即時調整。高畫質最多支援 1,100 棵實例化樹木；森林的固定種子近／遠景批次，以及五個依鏡頭距離串流的區域，會共同降低遠距幾何與陰影成本。HUD 會即時顯示目前啟用的串流區域數量。

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
- 62 項固定性、生命週期、Shader、音效、環境、串流、NPC 動作、碰撞、鏡頭、室內、區域拓樸、任務狀態、場景深化、分段生成、重建協調與場景呈現測試全數通過。涵蓋跨區域任務轉換與地標映射、固定種子 NPC 巡查設定、減少動態時的姿勢還原、鏡頭距離啟用、串流遲滯與空中視角覆寫、種子／日夜感知音訊設定、漸進任務提示音、生成途中取消與清理、山脈／遺跡／車站生成、固定種子城堡、霧岔與 Veyra Archive 室內陳設、NPC／任務掛點契約、貼地移動、世界／湖泊／城堡／村莊碰撞、種子化細節設定、夜間補光管理、曝光、霧密度、日夜轉換、陰影切換、地標中心環繞、拖曳暫停自轉與重複清理安全性。
- 正式建置與 Lint 均無錯誤。目前僅有 Three.js 用戶端區塊壓縮後超過 500 kB 的非阻擋警告。
- 生成器 `1.9.0` 的中等畫質城堡視角，在本機 Chromium／WebGL2、1920×1080 驗證中為 60 FPS、189 Draw Calls、66k 三角形、66 個 Geometry 與 16 個 Texture；城堡大廳視角則為 60 FPS、129 Draw Calls 與 59k 三角形。不同裝置的 FPS 仍取決於實際硬體。
- 1920×1080 的 `20× rebuild audit` 已通過穩定驗證：Geometry 維持 `66→66`，瀏覽器可提供的 Heap 樣本在重建後三秒觀察窗中由 `38.5→39.2 MB`。

### 實作說明

本體直接使用 Three.js 管理場景、鏡頭、Renderer、幾何、Shader、Instancing 與 GPU 資源生命週期。獨立的鏡頭、碰撞與環境系統透過明確的更新及清理流程，管理輸入事件、導覽／地面行走／自由飛行／環繞切換、貼地移動、日夜照明、天空、霧、星光、天體、水面高光、曝光、Bloom 與陰影狀態。

地形、城堡石材、石板屋頂、樹幹與村莊木材均使用與種子相關的世界座標程序材質。魔法光點完全在 GPU Point Shader 中運作。湖泊、水岸岩石、蘆葦與島嶼共用同一條固定邊界；水面 Shader 提供解析波浪、深淺水色、Fresnel 反射、天體高光與岸邊泡沫。

生成器 `1.8.0` 新增具有拱門入口的城門建築、實例化城堡扶壁與垛口、種子化村莊煙囪、窗框與懸掛招牌，以及傾斜樹幹和近景雙層樹冠。細節設定使用隔離的種子命名空間，輪廓變化不會連帶改變其他系統。村莊窗戶與飾條以共用 Instancing 批次繪製，使新增細節的 Draw Call 成本維持受控。

生成器 `1.9.0` 將原本實心的城堡大廳改為中空建築外殼，同時保留外部屋頂輪廓。場景 `8` 會呈現具有長桌、長椅、講台、旗幟、發光窗戶、屋樑、二十四根漂浮蠟燭，以及範圍受限的暖色燭光補光；相同種子會重現相同的蠟燭配置。十四扇塔樓窗戶現在共用單一 InstancedMesh 批次，在維持立面外觀的同時，讓完整 1080p 城堡視角低於 Phase 1 的 Draw Call 上限。

生成器 `2.0.0` 在不改動既有世界拓樸的前提下加入種子化視覺深化層。城堡新增圖書館側翼、陽台、庭院拱廊、橋梁支撐輪廓與獨立的金屬觀測屋頂；Lumen Row 新增酒館、商店、市集廣場、噴泉、路燈、柵欄與石巷；The Thorn Veil 新增裸露樹根、倒木、蘑菇、路標遺跡與局部霧區。世界環境也加入程序化雲層、四處場景符文、環繞圖書館的漂浮書籍，以及穿越場景的移動燈籠。新的種子化金屬與透射鉛框玻璃材質會由這些物件共用，大量重複細節則依畫質層級維持 Instancing。

生成器 `2.1.0` 將剩餘的 PRD 預留方向提升為正式世界區域。種子化 Umbravale Range 形成多層北方天際線與巨型山口；Orison Ruins 包含完整柱陣、殘存拱門、碎石場、中央高台與玻璃記憶巨石；Veilcross Station 則包含站房、鐘塔、月台、軌道、枕木、玻璃雨棚與移動魔法車廂。三個區域都具備 Manifest Zone、電影導覽目的地、直接場景切換、依畫質調整的 Instancing，以及適用處的地面碰撞。

生成器 `2.2.0` 將霧岔車站原本的實心站房改造成專案第二個可進入室內空間。候車廳在保留外部輪廓的同時加入中空外殼、木地板、售票櫃台與窗口、六張長椅、種子化行李配置、班次符文板、屋樑、吊燈與範圍受控的暖色補光。具名的站務員、列車長與班次任務掛點，為之後的玩法提供穩定接點；`I` 快捷鍵與依種子決定的封印班次互動，則讓完整 NPC／任務系統完成前就能探索這個空間。

生成器 `2.3.0` 在這些掛點上加入程序化的站務員 Elyra 與列車長模型；兩名角色都帶有明確的互動 Metadata 與發光任務標記。候車廳面板現在形成有限的三步驟任務：解讀班次板、與站務員交談、領取正確通行印記。目的地、公告、委託與獎勵都由目前世界種子固定決定；切換種子重建時會自然重置，不會把舊世界的任務狀態帶入新世界。

生成器 `2.4.0` 加入完全在執行時產生的原創 Web Audio 聲景。每個種子會控制低頻 Drone、泛音與濾波風聲；日夜切換會平滑調整頻率、明亮度與總音量，不需重新建立音訊圖。霧岔任務的三次操作會依進程產生逐步豐富的合成提示和弦。聲音只能透過頂部 `Sound` 或 `M` 主動開啟，會跟隨世界重建更新，並具備明確的清理生命週期。

生成器 `2.5.0` 為五個獨立管理的細節區域加入鏡頭距離串流：城堡深化、村莊深化、Umbravale、Orison Ruins 與 Veilcross Station。畫質等級會決定啟用與釋放距離，遲滯設計則避免物件在邊界反覆閃爍。空中勘察與高空飛行會強制顯示所有區域；關閉 HUD 串流開關時也會立即還原完整場景。核心地形、主要建築、水體、森林與環境會持續存在。

生成器 `2.6.0` 為車站角色加入固定種子的環境行為。站務員 Elyra 會進行細微工作動作，任務標記則持續脈動；列車長會在候車廳入口附近依種子決定的步速、相位與路線寬度執行有限巡查。暫停環境動畫時兩名角色會自然停住，減少動態效果則會還原穩定基準姿勢；每次重建世界也會重新綁定動作系統，不保留舊場景參照。

生成器 `2.7.0` 將霧岔微型任務擴展成跨區域遞送路線。取得通行印記後，持續顯示的追蹤面板會依目前種子將玩家送往 Umbravale、Orison Ruins 或 Lumen Row，透過既有鏡頭系統切換地標，並呈現該地專屬的最終交付內容。有限的六狀態機會防止跳步與重複轉換，每個旅程階段也都有不同的合成提示音。

生成器 `2.8.0` 將 Veyra Archive 圖書館側翼改造成專案第三個可進入室內空間。中空外殼內加入種子化書櫃與書籍、閱讀桌、鉛框玻璃天窗、漂浮書籍、中央檔案桌、發光記憶球、範圍受控的室內燈光，以及供未來互動使用的固定研究員掛點；原有屋頂、窗戶與陽台外觀則完整保留。使用 `L` 快捷鍵或固定場景視角即可直接進入。

世界重建採用原子化、最新請求優先的流程。世界建立已拆成決定性的分段工作，每段都會在瀏覽器完成一次繪製後讓出主執行緒，因此舊世界能持續顯示，已被取代的 Ticket 也能在生成途中透過 `AbortController` 真正取消。半成品從第一個可取消邊界起便由暫存 Root 持有資源，取消時會自動清理。新世界完成建立與驗證後才取代目前場景；共用資源由可重複安全清理的 Registry 去重並釋放。生成失敗時舊世界仍可使用；WebGL Context 恢復後則會觸發已驗證的重建流程。`20× rebuild audit` 會記錄 GPU Geometry，以及瀏覽器提供 Heap Telemetry 時的記憶體樣本。最新一次協調器驗證維持 `65→65` 個 Geometry，Heap 樣本由 `36.9→34.7 MB`。

城堡 Manifest 是由塔樓、大廳、中庭、城門、走廊、橋梁與移動階梯路線組成的連通拓撲。村莊配置會驗證道路退縮、區域範圍、城堡與湖泊排除、地形坡度、唯一 ID 與建築間距。電影式鏡頭使用與種子相關的 Catmull–Rom 曲線穿過五個地形安全地標，並以二十組回歸種子檢查每個曲線區段。

專案沒有使用任何第三方模型、貼圖、角色、名稱或系列作品資產。建築、地形、水體、植被、村莊與環境效果都在執行時生成。

### 專案範圍

目前版本包含完成度完整的 Phase 1 垂直切片，以及 Phase 2 的地面碰撞導航、三個可進入室內場景、兩名具有動作的車站角色、第一條完整固定種子跨區域任務、原創程序化聲景與鏡頭距離區域串流。更廣泛的世界 NPC 群體仍屬後續階段規劃。
