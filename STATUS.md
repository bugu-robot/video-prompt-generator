# Development status

All six feasible implementation phases are complete on `feat/local-first-video-prompt-generator`. Draft PR [#1](https://github.com/bugu-robot/video-prompt-generator/pull/1) remains open and draft. Main was initialized with a README only because the repository had no commits; all application work is on the feature branch. No merge, deployment, visibility change or provider generation. Reference/Mochi repositories are untouched.

## Implemented

- Shared typed Motion Plan and three deterministic provider compilers, bilingual interpretation, ambient/rotation/cinematic modes, separate turntable/orbit, qualitative amplitude and relevant preservation.
- 23 complete data-driven presets and safe custom save/update/rename/duplicate/delete/import/export; deterministic A/B/C, provider comparison, original-English copy and versioned text/JSON exports.
- Source image validation/preview/metadata and pointer/keyboard subject region, with no vision claims or byte persistence. Local video decode/playback, first/near-last samples, RGB/luma metrics, manual pending checklist and report.
- Installable offline PWA for root/Pages, content-versioned cache, visible waiting updates and settings retention. No external runtime resources, AI calls, accounts or backend.
- Strict schema/example and documented future Mochi adapter preserving existing approval/kill switch. All requested engineering/provider/preset/loop/rotation/testing/Hong Kong Chinese user documents.

## Current remediation snapshot (compiler 1.1.0)

- Genuinely separate provider composition: natural motion-led Omni, camera/shot and action-hierarchy Veo, direct action/timing Grok. Shared typed cues/constraints preserve user intent; explicit density modes shorten clauses or add relevant temporal detail.
- Undirected conflict pairs report once regardless of declaration/selection order, including sleep/breathing; all active copy gates block real conflicts. Rotation's dormant motion behavior is retained.
- Version-pair allowlist and immutable v1 verifier preserve old schema/fixtures/original raw prompt. Explicit old/new review is required before migrating unchanged intent. Current exports clearly use compiler 1.1.0. Custom preset data is not rewritten.
- Source confirmation invalidates for subject/scene/motion membership/image/region changes; unrelated controls retain it. Same-file replacement, presets and configuration adoption require reconfirmation.
- Prompt/config rendering never replaces or moves the QC player. Position, playing/paused state, playback speed, notes and checklist survive ordinary editing; replacement/clear/navigation abort/release old media with stale completion protection.

| Environment | Current measured outcome |
| --- | --- |
| Local Node 24 | clean npm ci, typecheck/lint pass; **467 unit tests**, 0 fail/skip, 6 files; root/Pages builds and audit 0 vulnerabilities pass |
| Actual local Chromium 153 | **61 browser tests**, 0 fail/skip (complete original suite plus 19 new shared cases); latest source follow-up is undergoing a final rerun before handoff |
| Local Firefox/WebKit | attempted; host browser dependencies/launch environment unavailable, not accepted as passes; remote CI supplies full platform evidence |
| Current Windows/Ubuntu / three-browser CI | pending this revision's push; outcomes will be recorded from actual completed jobs |

Preserved reviewed baseline `8858a181d116668ce9b78938b33d6b0724773411`: Windows/Ubuntu each 221 units; Chromium/Firefox/WebKit 42/41/41 = 124, 0 fail/skip, [verified run](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38138566600). The current suite adds 246 units (including 27 fixed historical export fixtures plus current contract) and 19 shared browser tests, for **467 units and 61/60/60 = 181 browser cases**. Original checks remain mandatory.

## Independent-review fixes (2026-10-11)

- Preset write/export validates the exact final representation with a shared 1 MiB (1,048,576 UTF-8 bytes) limit and 100-item limit. An oversized merged import fails before the one atomic write, preserving existing bytes. Save/update/rename/delete/import require a successful existing-data read; malformed/oversized/schema-invalid data is never an empty fallback. Quota failures preserve prior contents, including when the startup write probe fails.
- The UI keeps unreadable preset data visible as a recovery state, disables ordinary mutation, offers exact raw backup and requires a downloaded backup plus explicit replacement confirmation for a validated recovery file. Validation/quota/stale-backup failures leave original data intact. Recovering a subset does not automatically migrate omitted entries; keep the raw backup.
- Rotation audits only emitted rigid turn/orbit motion, retaining dormant Ambient/Cinematic selections. Real conflicts return when those modes become active; base, A/B/C and comparison copy gates use their own actual plans.
- One-way 90°/180° turntable/orbit workflows suggest a distinct final orientation/viewpoint, no endpoint/no loop, or a separately designed return path/edit. Full revolutions and returning-pose plans keep appropriate identical-endpoint suggestions. Grok controls stay unknown; angle/direction/mechanics are never changed silently.
- Validated export mirrors compare semantically regardless of object-key order. Ordered arrays, strict values, registered schema/compiler/capability pairs, canonical dates and historical/current English recompilation remain enforced. Schema version stays 1.0.0; the historical example remains unchanged, alongside the current compiler example.

Real browser acceptance includes clipboard readback, H.264 decode, image privacy/region interaction, atomic imports, responsive layouts and real Service Worker root/Pages offline reload plus explicit waiting-worker update. Fixed CORS Vary cache matching, update-worker lifecycle, import notifications, source confirmation reset, axis convention and canonical dates. Final rotation-loop clauses never invent ambient movement or demand contradictory partial-turn closure.

Local Playwright CDN downloads were blocked; a separately provisioned Chromium was actually run. Firefox/WebKit results above are actual inspected GitHub CI logs, not simulated local success. Both Ubuntu static-review and browser-report uploads failed with the account artifact-storage quota error in the verified CI run. These optional uploads did **not** succeed; mandatory validation passed and remains enforced. Windows intentionally has no static-artifact upload. No existing artifacts were deleted.

## Remaining limitations and manual acceptance

- Grok consumer I2V/model/duration/reference/audio details remain unverified; separate API evidence cannot establish website controls. Flow capabilities are a dated official consumer snapshot, not account UAT.
- Prompts cannot prove hidden geometry, actual 360 completion, silence or seamless looping. QC provides endpoint metrics and human review, not identity/pose/angle understanding; the near-last sample is approximate.
- Fixed uniform/steady rigid rotation leaves no motion freedom for A/B/C; identical core prompts are explicitly disclosed. Eased rotation and selected ambient/cinematic actions support real deterministic variants.
- Browser codec/storage/install behavior varies. Native Safari/iOS and Windows device installation, full accessibility/device UAT and optional real Flow/Grok video-quality trials remain manual. See docs/TESTING.md and docs/USER_GUIDE_ZH_HK.md.
- No provider automation, real 3D renderer, bot transport, Drive/Telegram connection or paid-generation service is part of this app.
