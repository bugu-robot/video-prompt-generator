# Architecture

Vanilla TypeScript + Vite. Runtime has no npm dependency, server, AI client or external resource. Node.js 24 is build/test tooling only.

- `src/models/`: complete shared Motion Plan and version-aware provider evidence.
- `src/data/`: curated motion/camera catalogs and 23 presets; UI never defines motion knowledge.
- `src/engine/`: normalization, rotation/camera separation, loop rules, intent sections, compiler dispatch, deterministic variations and rule audit.
- `src/engine/compilers/`: Omni natural language, Veo cinematic sections, Grok direct motion intent; all consume shared MotionCue semantics, use their own action expression and substantive priority order, and retain identical geometric/safety constraints.
- `src/i18n/`: Traditional Chinese labels and explanations; every prompt section pairs English with Chinese intent.
- `src/storage/`: strict schema validator, atomic preset persistence, JSON export/import and clipboard/download helpers.
- `src/media/`: local image validation/decoding, rectangle metadata, local video decoding/frame metrics. No vision model.
- `src/ui/`: accessible responsive workbench and state-driven real actions.
- `src/pwa/`, `scripts/`, `vite.config.ts`: explicit waiting-worker update and content-derived scoped offline cache.
- `tests/unit/`, `tests/e2e/`: deterministic engine regressions and real-browser application/offline acceptance.

Data flow: user controls → normalized Motion Plan → shared MotionCue/constraint clauses → provider-specific composition/density → provider compiler → original English / Chinese interpretation / audit. A/B/C derive separate plans; exports contain the exact selected derived plan. Source selection is manual. Provider comparison preserves intent and diagnoses capabilities per target.

Internal normalization tolerates old local settings; external JSON import is strict and versioned, rejects unknown fields, hostile keys, inconsistent mirrored fields and out-of-bound data before any preset write. Media bytes/object URLs are never written into LocalStorage or JSON reports. Settings persistence deliberately drops image metadata/regions and source-element confirmation because image bytes must be reselected after reload. Both reads of legacy settings and writes of current settings clear the whole source session, without changing the active in-memory confirmation or other controls/presets.

Preset reads distinguish an empty collection from unreadable stored data. Ordinary save/update/rename/delete/import operations require a successful strict read. The exact final pretty-printed UTF-8 representation is validated against the same 1 MiB limit used for read/import/export before one atomic `setItem`; count is also limited to 100. Quota errors never trigger clearing or a fallback write. An unreadable collection remains intact, with a raw download and an explicit backed-up recovery workflow; recovery validates the replacement and checks that the original string still matches the backup. It does not silently repair or discard entries. Export mirror comparisons ignore object key ordering, while array order, strict values and all version/compiler/date/prompt checks remain enforced.

Default motion is conditional breathing, steam and rain with locked camera and subtle intensity. That is a safe intent template, not a claim that these objects exist in an uploaded image. Rotation isolates rigid motion; ambient controls remain stored for other modes. Pure fixed-speed rotation can constrain all motion degrees of freedom, so identical variation prompts are explicitly disclosed.

Motion conflicts are audited only for the actions active in the current mode. Rotation retains dormant ambient selections without compiling or blocking on them; returning to Ambient/Cinematic reactivates their checks. Copy gates use each actual base/derived/provider-comparison plan. Partial-turn frame advice uses distinct endpoints or an externally designed edit/return path; identical first/last-frame advice is reserved for a full revolution or an explicitly returning-pose plan.

Consumer capability status is independent of API evidence. Supported website workflow advice remains advice: the app cannot configure Flow or Grok. New provider versions require source/date/confidence and regression updates.

Offline caches use build inputs and base path as identity. Install precaches every emitted static asset plus manifest/icons; it fails atomically if assets are unavailable. An update waits until the user chooses the visible update action; settings save first. Active media requires reselecting after reload. CI builds Pages artifacts but contains no hosting/deployment mutation.

Compiler 1.1.0 separates semantic actions from provider composition. Omni leads with natural concurrent action, Veo with shot/camera and action hierarchy, Grok with direct animation plus timing. Density changes real clauses, not only whitespace; Detailed adds mode/timing-specific intermediate-motion guidance. All densities retain selected actions, mechanical constraints and applicable identity/preservation.

Configuration import has two outputs: the byte-exact historical export and a current recompile of the unchanged plan. `export-profiles.ts` is an explicit version-pair registry; `storage/legacy-v1/` freezes v1 compilation, normalization, audit, data, labels and capabilities solely for verification. Strict mirrors/date/prompt/findings checks use the historical verifier. UI review and explicit adoption are required for migration; the original remains in session memory with a download route. Future incompatible/lossy plan changes must fail rather than fall back or silently change intent. Schema remains v1; custom preset data is not rewritten.

Source-element confirmation tracks subject type/descriptions, scene notes, selected motion membership, image and region. `source-confirmation.ts` invalidates only changed semantic basis; new/replaced images and preset/config adoption always require confirmation. Provider/camera/density/language changes preserve it within the active session. `clearSourceSession()` clears metadata, region and confirmation together on save/load/pagehide. Pagehide also clears the file control and pending drawing; the previous-plan snapshot is refreshed so a new confirmation is not invalidated by retired metadata. Persisted pageshow clears confirmation if no live image remains. Checkbox state is synchronized immediately and on the next animation frame so browser-owned form restoration cannot revive a stale value. Ordinary renders still retain live confirmation and QC state.

Prompt and QC DOM subtrees are independent. Ordinary full/config/output renders replace only prompt/configuration/header parts, never detach/reparent or recreate the active QC player. Notes/checks remain in the QC result and controls remain in place. Video replacement/clear/pagehide explicitly abort decode, unload the old player and revoke its Blob URL; tokens discard stale decode completions. Restoring a cached page re-renders cleared media rather than showing stale QC. Media bytes remain session-only.
