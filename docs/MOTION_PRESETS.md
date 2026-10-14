# Motion preset library

23 curated built-in presets. Data source: `src/data/motion-presets.ts`. Every preset has stable ID, both names, description, mode, complete recommended plan, provider notes and warnings. Presets never confirm image contents.

| Category | Stable ID | English name | 繁體中文名稱 | Mode |
| --- | --- | --- | --- | --- |
| Cozy Café | `cafe-rain-window` | Rainy Café Window | 雨天咖啡廳窗邊 | ambient |
| Cozy Café | `cafe-steam` | Coffee Steam | 咖啡蒸氣 | ambient |
| Cozy Café | `cafe-morning` | Quiet Morning Café | 寧靜早晨咖啡廳 | ambient |
| Cozy Café | `cafe-fireplace` | Cozy Fireplace | 溫暖壁爐 | ambient |
| Cozy Café | `cafe-reading` | Reading by the Window | 窗邊閱讀 | ambient |
| Mochi / Character | `character-blink` | Gentle Blink | 輕柔眨眼 | ambient |
| Mochi / Character | `character-sleep` | Sleeping Breath | 熟睡呼吸 | ambient |
| Mochi / Character | `character-looking` | Looking Outside | 望向窗外 | ambient |
| Mochi / Character | `character-ears` | Subtle Ear Movement | 耳朵微動 | ambient |
| Mochi / Character | `character-tail` | Gentle Tail Movement | 尾巴輕擺 | ambient |
| Nature | `nature-leaves` | Falling Autumn Leaves | 秋葉飄落 | ambient |
| Nature | `nature-snow` | Snowfall | 輕柔飄雪 | ambient |
| Nature | `nature-ocean` | Ocean Waves | 海浪起伏 | ambient |
| Nature | `nature-breeze` | Gentle Breeze | 柔和微風 | ambient |
| Nature | `nature-clouds` | Moving Clouds | 雲朵緩移 | ambient |
| Rotation | `rotation-360-turntable` | 360° Product Turntable | 360° 產品自轉 | rotation |
| Rotation | `rotation-180-reveal` | 180° Object Reveal | 180° 物件展示 | rotation |
| Rotation | `rotation-slow-orbit` | Slow Product Orbit | 慢速產品繞拍 | rotation |
| Rotation | `rotation-character` | Character Turnaround | 角色全方向展示 | rotation |
| Cinematic | `cinematic-locked` | Locked Cinematic Shot | 固定電影感鏡頭 | cinematic |
| Cinematic | `cinematic-push` | Slow Push-In | 慢慢推近 | cinematic |
| Cinematic | `cinematic-parallax` | Gentle Parallax | 輕柔視差 | cinematic |
| Cinematic | `cinematic-reveal` | Slow Scene Reveal | 慢速場景展示 | cinematic |

Applying a preset preserves user source descriptions and provider/model, resets element confirmation, and explicitly applies its recommended motion settings. Editing any setting is immediate; saving creates or updates a custom snapshot. Built-in records are immutable through the UI.

Custom presets support save/update/rename/duplicate/delete and single/batch JSON export. Imports use a strict versioned schema, reject the entire malformed batch, create new IDs and write atomically without overriding existing entries. Presets exclude image metadata/bytes and source rectangles. Maximum: 100 custom presets and **1 MiB (1,048,576 UTF-8 bytes)** for incoming JSON and the final aggregate stored/exported representation. Two individually valid batches can exceed that aggregate limit; the merge is rejected before any write, preserving the previous raw string exactly. Quota failures also preserve prior data.

Unreadable existing collections are never treated as empty for ordinary mutations. They remain in storage with an explicit raw-backup download and recovery UI. The user first saves the original backup, confirms replacement, then supplies a repaired schema-valid bundle within the same limits. Failed validation/quota or a changed original string aborts recovery. A full/read-only store's failed startup write probe retains its reader so existing data can still be viewed or backed up. The Hong Kong Chinese guide describes repair/splitting and recovery trade-offs.

Audio, duration, preservation and density edits retain the selected motion preset and its session-only cancellation snapshot. Clicking the same active preset restores prior motion while preserving later independent edits; untouched peripheral settings return to pre-apply values. Custom dirty indicators and Update/Rename/Delete remain available. Core motion edits still remove built-in selection; Undo can recover the snapshot.

Stable motion `ripples` is displayed as **Breeze-driven water surface / 微風吹拂水面**. Custom presets selecting it compile calm breeze-driven continuous undulation, horizontal ripples and shimmering, excluding droplet/rain/object impacts, splashes and circular/point-source ripples. The 23 built-ins contain no `ripples` selection; `nature-ocean` continues to use the distinct ocean `waves` motion.
