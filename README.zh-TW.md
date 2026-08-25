# 夜曲輿圖

[English](README.md) · **繁體中文**

使用 Three.js 與 TypeScript 打造的原創種子驅動 3D 魔法世界。

## 場景圖庫

夜間與白天兩組圖庫均擷取自固定種子 `MAGIC-001`、生成器 `2.9.0` 與中等畫質。二十張圖片都是實際可切換的場景目的地，抵達後導覽會保持暫停，並包含三個種子化室內場景與世界常駐角色。

### 夜晚

| 1 · 維拉城堡 | 2 · 流明街村莊 |
| --- | --- |
| ![Castle of Veyra scene with gothic towers and floating candles](docs/screenshots/castle.png) | ![Lumen Row village approach among castle walls and forest](docs/screenshots/village.png) |

| 3 · 鏡月湖 | 4 · 荊棘帷幕森林 |
| --- | --- |
| ![Mirror Mere moonlit shoreline and glowing wisps](docs/screenshots/lake.png) | ![The Thorn Veil procedural forest with fireflies](docs/screenshots/forest.png) |

| 5 · 星界尖塔 | 6 · 移動階梯中庭 |
| --- | --- |
| ![Astral Spire upper observatory and floating candles](docs/screenshots/tower.png) | ![Moving Stair courtyard connection study](docs/screenshots/courtyard-stair.png) |

| 7 · 空中勘察 | 8 · 城堡大廳 |
| --- | --- |
| ![Aerial survey showing the deterministic world zoning overview](docs/screenshots/aerial.png) | ![The Great Hall interior with floating candles, long tables, banners, and a dais](docs/screenshots/great-hall.png) |

| 9 · 霧岔候車廳 | 10 · Veyra 檔案圖書館 |
| --- | --- |
| ![Veilcross waiting hall at night with the glowing departure board and a resident traveller](docs/screenshots/station-hall.png) | ![Veyra Archive library at night with seeded bookcases, floating volumes, and the archive researcher](docs/screenshots/library-hall.png) |

### 白天

| 1 · 維拉城堡 | 2 · 流明街村莊 |
| --- | --- |
| ![Castle of Veyra in daylight with gothic towers, battlements, and surrounding forest](docs/screenshots/castle-day.png) | ![Lumen Row village and road in daylight beneath the castle](docs/screenshots/village-day.png) |

| 3 · 鏡月湖 | 4 · 荊棘帷幕森林 |
| --- | --- |
| ![Mirror Mere shoreline, reeds, rocks, and castle view in daylight](docs/screenshots/lake-day.png) | ![The Thorn Veil procedural forest and layered tree canopies in daylight](docs/screenshots/forest-day.png) |

| 5 · 星界尖塔 | 6 · 移動階梯中庭 |
| --- | --- |
| ![Astral Spire observatory and floating candles in daylight](docs/screenshots/tower-day.png) | ![Moving Stair courtyard and castle connections in daylight](docs/screenshots/courtyard-stair-day.png) |

| 7 · 空中勘察 | 8 · 城堡大廳 |
| --- | --- |
| ![Aerial daylight survey of the complete deterministic world](docs/screenshots/aerial-day.png) | ![The Great Hall daylight interior with sunlit walls, tables, banners, and floating candles](docs/screenshots/great-hall-day.png) |

| 9 · 霧岔候車廳 | 10 · Veyra 檔案圖書館 |
| --- | --- |
| ![Veilcross waiting hall in daylight with the departure board, tall windows, and a resident traveller](docs/screenshots/station-hall-day.png) | ![Veyra Archive library in daylight with seeded bookcases, floating volumes, and the archive researcher](docs/screenshots/library-hall-day.png) |

---

## 操作方式

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

## 畫面與環境控制

日夜按鍵會完整轉換天空、霧、星光、天體光源、水面高光、補光、曝光、Bloom 與選用的程序化聲景。夜間使用月光主光源、無陰影冷色補光、提高的半球環境光、較深沉的種子化低頻聲景與較淺的霧，讓城堡與地形輪廓更清楚，同時保留月夜氛圍。聲音預設靜音，必須由使用者主動開啟。

HUD 提供低、中、高三種實際畫質等級，以及大氣霧、後製總開關、可獨立切換的色彩分級、HDR Bloom 與 Vignette、FXAA、中高畫質 SSAO、動態陰影、區域診斷、減少動態效果、環境動畫與距離串流。霧密度、Bloom 強度與水面動態可即時調整。高畫質最多支援 1,100 棵實例化樹木；森林的固定種子近／遠景批次，以及五個依鏡頭距離串流的區域，會共同降低遠距幾何與陰影成本。HUD 會即時顯示目前啟用的串流區域數量。

## 本機開發

```bash
npm install
npm run dev
```

使用 `npm run build` 建立正式版本，使用 `npm test` 執行固定種子回歸測試，使用 `npm run lint` 執行靜態檢查。

## 實作說明

本體直接使用 Three.js 管理場景、鏡頭、Renderer、幾何、Shader、Instancing 與 GPU 資源生命週期。獨立的鏡頭、碰撞與環境系統透過明確的更新及清理流程，管理輸入事件、導覽／地面行走／自由飛行／環繞切換、貼地移動、日夜照明、天空、霧、星光、天體、水面高光、曝光、Bloom 與陰影狀態。

地形、城堡石材、石板屋頂、樹幹與村莊木材均使用與種子相關的世界座標程序材質。魔法光點完全在 GPU Point Shader 中運作。湖泊、水岸岩石、蘆葦與島嶼共用同一條固定邊界；水面 Shader 提供解析波浪、深淺水色、Fresnel 反射、天體高光與岸邊泡沫。

生成器 `1.8.0` 新增具有拱門入口的城門建築、實例化城堡扶壁與垛口、種子化村莊煙囪、窗框與懸掛招牌，以及傾斜樹幹和近景雙層樹冠。細節設定使用隔離的種子命名空間，輪廓變化不會連帶改變其他系統。村莊窗戶與飾條以共用 Instancing 批次繪製，使新增細節的 Draw Call 成本維持受控。

生成器 `1.9.0` 將原本實心的城堡大廳改為中空建築外殼，同時保留外部屋頂輪廓。場景 `8` 會呈現具有長桌、長椅、講台、旗幟、發光窗戶、屋樑、二十四根漂浮蠟燭，以及範圍受限的暖色燭光補光；相同種子會重現相同的蠟燭配置。十四扇塔樓窗戶現在共用單一 InstancedMesh 批次，在維持立面外觀的同時，讓完整 1080p 城堡視角低於 Phase 1 的 Draw Call 上限。

生成器 `2.0.0` 在不改動既有世界拓樸的前提下加入種子化視覺深化層。城堡新增圖書館側翼、陽台、庭院拱廊、橋梁支撐輪廓與獨立的金屬觀測屋頂；Lumen Row 新增酒館、商店、市集廣場、噴泉、路燈、柵欄與石巷；The Thorn Veil 新增裸露樹根、倒木、蘑菇、路標遺跡與局部霧區。世界環境也加入程序化雲層、四處場景符文、環繞圖書館的漂浮書籍，以及穿越場景的移動燈籠。新的種子化金屬與透射鉛框玻璃材質會由這些物件共用，大量重複細節則依畫質層級維持 Instancing。

生成器 `2.1.0` 將剩餘的規劃方向提升為正式世界區域。種子化 Umbravale Range 形成多層北方天際線與巨型山口；Orison Ruins 包含完整柱陣、殘存拱門、碎石場、中央高台與玻璃記憶巨石；Veilcross Station 則包含站房、鐘塔、月台、軌道、枕木、玻璃雨棚與移動魔法車廂。三個區域都具備 Manifest Zone、電影導覽目的地、直接場景切換、依畫質調整的 Instancing，以及適用處的地面碰撞。

生成器 `2.2.0` 將霧岔車站原本的實心站房改造成專案第二個可進入室內空間。候車廳在保留外部輪廓的同時加入中空外殼、木地板、售票櫃台與窗口、六張長椅、種子化行李配置、班次符文板、屋樑、吊燈與範圍受控的暖色補光。具名的站務員、列車長與班次任務掛點，為之後的玩法提供穩定接點；`I` 快捷鍵與依種子決定的封印班次互動，則讓完整 NPC／任務系統完成前就能探索這個空間。

生成器 `2.3.0` 在這些掛點上加入程序化的站務員 Elyra 與列車長模型；兩名角色都帶有明確的互動 Metadata 與發光任務標記。候車廳面板現在形成有限的三步驟任務：解讀班次板、與站務員交談、領取正確通行印記。目的地、公告、委託與獎勵都由目前世界種子固定決定；切換種子重建時會自然重置，不會把舊世界的任務狀態帶入新世界。

生成器 `2.4.0` 加入完全在執行時產生的原創 Web Audio 聲景。每個種子會控制低頻 Drone、泛音與濾波風聲；日夜切換會平滑調整頻率、明亮度與總音量，不需重新建立音訊圖。霧岔任務的三次操作會依進程產生逐步豐富的合成提示和弦。聲音只能透過頂部 `Sound` 或 `M` 主動開啟，會跟隨世界重建更新，並具備明確的清理生命週期。

生成器 `2.5.0` 為五個獨立管理的細節區域加入鏡頭距離串流：城堡深化、村莊深化、Umbravale、Orison Ruins 與 Veilcross Station。畫質等級會決定啟用與釋放距離，遲滯設計則避免物件在邊界反覆閃爍。空中勘察與高空飛行會強制顯示所有區域；關閉 HUD 串流開關時也會立即還原完整場景。核心地形、主要建築、水體、森林與環境會持續存在。

生成器 `2.6.0` 為車站角色加入固定種子的環境行為。站務員 Elyra 會進行細微工作動作，任務標記則持續脈動；列車長會在候車廳入口附近依種子決定的步速、相位與路線寬度執行有限巡查。暫停環境動畫時兩名角色會自然停住，減少動態效果則會還原穩定基準姿勢；每次重建世界也會重新綁定動作系統，不保留舊場景參照。

生成器 `2.7.0` 將霧岔微型任務擴展成跨區域遞送路線。取得通行印記後，持續顯示的追蹤面板會依目前種子將玩家送往 Umbravale、Orison Ruins 或 Lumen Row，透過既有鏡頭系統切換地標，並呈現該地專屬的最終交付內容。有限的六狀態機會防止跳步與重複轉換，每個旅程階段也都有不同的合成提示音。

生成器 `2.8.0` 將 Veyra Archive 圖書館側翼改造成專案第三個可進入室內空間。中空外殼內加入種子化書櫃與書籍、閱讀桌、鉛框玻璃天窗、漂浮書籍、中央檔案桌、發光記憶球、範圍受控的室內燈光，以及供未來互動使用的固定研究員掛點；原有屋頂、窗戶與陽台外觀則完整保留。使用 `L` 快捷鍵或固定場景視角即可直接進入。

生成器 `2.9.0` 為整個世界加入固定種子的常駐角色群體。十六組種子化配置分布於城堡、Lumen Row、The Thorn Veil、Mirror Mere、Umbravale、Orison Ruins、Veilcross Station 與 Veyra Archive，實際依畫質等級啟用八、十二或十六名。所有角色共用斗篷、頭部、帽簷、帽冠與法杖五個 InstancedMesh 批次，因此不論人數多寡都只增加五個 Draw Call。種子化的步速、相位、步幅與朝向會驅動低成本的呼吸、轉身與短距離巡查動作；具名掛點則帶有角色、區域與名稱 Metadata，供後續互動使用。暫停環境動畫與減少動態效果會還原穩定基準姿勢，每次世界重建也會重新綁定系統，不保留舊場景參照。指路燈籠外殼同時從共用金屬 Shader 改為專屬暖銅材質，讓靠近鏡頭的燈籠讀起來是點亮的燈具，而不是未受光的黑色剪影。

世界重建採用原子化、最新請求優先的流程。世界建立已拆成決定性的分段工作，每段都會在瀏覽器完成一次繪製後讓出主執行緒，因此舊世界能持續顯示，已被取代的 Ticket 也能在生成途中透過 `AbortController` 真正取消。半成品從第一個可取消邊界起便由暫存 Root 持有資源，取消時會自動清理。新世界完成建立與驗證後才取代目前場景；共用資源由可重複安全清理的 Registry 去重並釋放。生成失敗時舊世界仍可使用；WebGL Context 恢復後則會觸發已驗證的重建流程。`20× rebuild audit` 會記錄 GPU Geometry，以及瀏覽器提供 Heap Telemetry 時的記憶體樣本。最新一次協調器驗證維持 `114→114` 個 Geometry；稽核結束後強制回收時，Heap 會回到 24 MB，低於稽核前的 25 MB 基準。

城堡 Manifest 是由塔樓、大廳、中庭、城門、走廊、橋梁與移動階梯路線組成的連通拓撲。村莊配置會驗證道路退縮、區域範圍、城堡與湖泊排除、地形坡度、唯一 ID 與建築間距。電影式鏡頭使用與種子相關的 Catmull–Rom 曲線穿過五個地形安全地標，並以二十組回歸種子檢查每個曲線區段。

專案沒有使用任何第三方模型、貼圖、角色、名稱或系列作品資產。建築、地形、水體、植被、村莊與環境效果都在執行時生成。

## 專案範圍

目前版本包含完成度完整的 Phase 1 垂直切片，以及 Phase 2 的地面碰撞導航、三個可進入室內場景、兩名具有動作的車站角色、第一條完整固定種子跨區域任務、原創程序化聲景、鏡頭距離區域串流，以及橫跨八個區域的固定種子世界常駐角色群體。
