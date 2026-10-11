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

Custom presets support save/update/rename/duplicate/delete and single/batch JSON export. Imports use a strict versioned schema, reject the entire malformed batch, create new IDs and write atomically without overriding existing entries. Presets exclude image metadata/bytes and source rectangles. Maximum: 100 custom presets and 1 MB import JSON.
