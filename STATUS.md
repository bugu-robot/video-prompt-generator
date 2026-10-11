# Development status

All six feasible implementation phases are complete on `feat/local-first-video-prompt-generator`. Draft PR [#1](https://github.com/bugu-robot/video-prompt-generator/pull/1) remains open and draft. Main was initialized with a README only because the repository had no commits; all application work is on the feature branch. No merge, deployment, visibility change or provider generation. Reference/Mochi repositories are untouched.

## Implemented

- Shared typed Motion Plan and three deterministic provider compilers, bilingual interpretation, ambient/rotation/cinematic modes, separate turntable/orbit, qualitative amplitude and relevant preservation.
- 23 complete data-driven presets and safe custom save/update/rename/duplicate/delete/import/export; deterministic A/B/C, provider comparison, original-English copy and versioned text/JSON exports.
- Source image validation/preview/metadata and pointer/keyboard subject region, with no vision claims or byte persistence. Local video decode/playback, first/near-last samples, RGB/luma metrics, manual pending checklist and report.
- Installable offline PWA for root/Pages, content-versioned cache, visible waiting updates and settings retention. No external runtime resources, AI calls, accounts or backend.
- Strict schema/example and documented future Mochi adapter preserving existing approval/kill switch. All requested engineering/provider/preset/loop/rotation/testing/Hong Kong Chinese user documents.

## Current focused P2: source confirmation across sessions

Reviewed baseline: `da2a573d79b1f91e1cd8ef0e0fc2c7990b2ff06b`, [verified CI](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38144374385): 467 units per OS / 181 browser passes.

- Settings save/load discard image metadata, region and confirmation together. Saving does not mutate the live session; old stored true flags cannot restore confirmation.
- Pagehide releases media and invalidates confirmation, file input and pending drawing. Persisted pageshow rechecks missing media, refreshes the previous-plan snapshot, and synchronizes browser-restored form state immediately/next frame. New explicit confirmation survives unrelated changes in the restored session.
- Source-independent controls, all selected motions, presets, typed plan/export versions, frozen migration verifiers, provider compilers and ordinary QC playback behavior remain unchanged.
- Added 7 unit cases and 7 shared real-browser cases: normal/legacy reload, root/Pages controlled offline reload, replacement/unrelated changes, actual backward/forward traversal and explicit persisted lifecycle dispatch. Native Chromium BFCache requires full Chromium and explicitly asserts `pageshow.persisted=true`; fresh-document history and dispatched lifecycle evidence are identified separately.

Current measured local validation: clean npm ci/typecheck/lint, **474 unit passes** (7 files, 0 fail/skip), root/Pages production builds and audit **0 vulnerabilities**. Full Firefox suite: **67 passed**, 0 fail/skip (test-process sandbox overrides). Full local Headless Shell run: **67 passed / 1 failed** (43.2 seconds), with the native BFCache assertion blocked by its delegate; full Chrome launch is blocked by the host Unix-socket policy. Full local WebKit run: **67 launch failures**, caused by missing system dependencies. These runs are not accepted as complete passes; full native cross-browser acceptance must come from completed CI.

First focused [CI run 38149834045](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38149834045), commit `9f90c4b2bc2e5b52dc1cacd46fa728961d075f9a`: Windows/Ubuntu mandatory checks pass, each with 474 units and 0 audit vulnerabilities. Browser conclusion **failure**, **201 passed / 1 failed**, 0 skipped (6.3 minutes): native Chromium history timed out waiting for a fresh `load`, a documented Playwright BFCache limitation; Firefox/WebKit each passed 67. The corrected harness uses native CDP history/current-realm evaluation and retains all cache/intent assertions. Optional artifact uploads failed storage quota. Full suite remains Chromium 68 + Firefox 67 + WebKit 67 = **202**, including **15** PWA/offline cases; corrected-head CI is pending. No critical test is skipped or weakened.

## Earlier remediation snapshot (compiler 1.1.0)

- Genuinely separate provider composition: natural motion-led Omni, camera/shot and action-hierarchy Veo, direct action/timing Grok. Shared typed cues/constraints preserve user intent; explicit density modes shorten clauses or add relevant temporal detail.
- Undirected conflict pairs report once regardless of declaration/selection order, including sleep/breathing; all active copy gates block real conflicts. Rotation's dormant motion behavior is retained.
- Version-pair allowlist and immutable v1 verifier preserve old schema/fixtures/original raw prompt. Explicit old/new review is required before migrating unchanged intent. Current exports clearly use compiler 1.1.0. Custom preset data is not rewritten.
- Source confirmation invalidates for subject/scene/motion membership/image/region changes; unrelated controls retain it. Same-file replacement, presets and configuration adoption require reconfirmation.
- Prompt/config rendering never replaces or moves the QC player. Position, playing/paused state, playback speed, notes and checklist survive ordinary editing; replacement/clear/navigation abort/release old media with stale completion protection.

| Environment | Verified earlier outcome |
| --- | --- |
| Local Node 24 | clean npm ci, typecheck/lint pass; **467 unit tests**, 0 fail/skip, 6 files; root/Pages builds and audit 0 vulnerabilities pass |
| Actual local Chromium 153 | **61 browser tests**, 0 fail/skip (complete original suite plus 19 new shared cases), final run 35.2 seconds |
| Actual local Firefox | **60 browser tests**, 0 fail/skip, final run 49.1 seconds; test-process sandbox overrides resolve the managed host's decoder restriction |
| Local WebKit | full suite attempted, but browser launch is blocked by missing system libraries; not counted as a pass |
| Windows/Ubuntu CI | [code-fix run 38143409461](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38143409461) **completed successfully** at `71c318becf6a12e44af3be2126caf2e80195fca2`: each platform passes **467 units**, 0 fail/skip, clean install/typecheck/lint/root/Pages builds/audit (0 vulnerabilities) |
| Chromium / Firefox / WebKit CI | Same completed run: **61 / 60 / 60 = 181 passed**, 0 fail/skip, 8.7 minutes; actual inspected logs include **9 real Service Worker offline/update passes** plus privacy/preset/QC regressions |

Preserved reviewed baseline `8858a181d116668ce9b78938b33d6b0724773411`: Windows/Ubuntu each 221 units; Chromium/Firefox/WebKit 42/41/41 = 124, 0 fail/skip, [verified run](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38138566600). The current suite adds 246 units (including 27 fixed historical export fixtures plus current contract) and 19 shared browser tests, for **467 units and 61/60/60 = 181 browser cases**. Original checks remain mandatory.

## Independent-review fixes (2026-10-11)

- Preset write/export validates the exact final representation with a shared 1 MiB (1,048,576 UTF-8 bytes) limit and 100-item limit. An oversized merged import fails before the one atomic write, preserving existing bytes. Save/update/rename/delete/import require a successful existing-data read; malformed/oversized/schema-invalid data is never an empty fallback. Quota failures preserve prior contents, including when the startup write probe fails.
- The UI keeps unreadable preset data visible as a recovery state, disables ordinary mutation, offers exact raw backup and requires a downloaded backup plus explicit replacement confirmation for a validated recovery file. Validation/quota/stale-backup failures leave original data intact. Recovering a subset does not automatically migrate omitted entries; keep the raw backup.
- Rotation audits only emitted rigid turn/orbit motion, retaining dormant Ambient/Cinematic selections. Real conflicts return when those modes become active; base, A/B/C and comparison copy gates use their own actual plans.
- One-way 90°/180° turntable/orbit workflows suggest a distinct final orientation/viewpoint, no endpoint/no loop, or a separately designed return path/edit. Full revolutions and returning-pose plans keep appropriate identical-endpoint suggestions. Grok controls stay unknown; angle/direction/mechanics are never changed silently.
- Validated export mirrors compare semantically regardless of object-key order. Ordered arrays, strict values, registered schema/compiler/capability pairs, canonical dates and historical/current English recompilation remain enforced. Schema version stays 1.0.0; the historical example remains unchanged, alongside the current compiler example.

Real browser acceptance includes clipboard readback, H.264 decode, image privacy/region interaction, atomic imports, responsive layouts and real Service Worker root/Pages offline reload plus explicit waiting-worker update. Fixed CORS Vary cache matching, update-worker lifecycle, import notifications, source confirmation reset, axis convention and canonical dates. Final rotation-loop clauses never invent ambient movement or demand contradictory partial-turn closure.

Local browser provisioning required alternate downloads and a separately provisioned Chromium. Firefox initially hit host sandbox/decoder restrictions; its final complete run passed with test-process environment overrides, without application or test changes. Local WebKit launch failures are not counted as successful acceptance; its complete **60-pass** acceptance is from the actual CI runner with installed dependencies. Both optional Ubuntu static-review and browser-report uploads in run 38143409461 failed with the account artifact-storage quota error. They **did not succeed**, even though the mandatory jobs passed. Windows intentionally has no static-artifact upload. No existing artifacts were deleted.

This document records the verified code snapshot. Documentation-only follow-ups also trigger the same full mandatory workflow; final-head results are attached to Draft PR #1 after checking actual logs. The [remediation handoff](docs/REMEDIATION_HANDOFF.md) lists all 45 changed files and the consolidated Windows UAT.

## Remaining limitations and manual acceptance

- Grok consumer I2V/model/duration/reference/audio details remain unverified; separate API evidence cannot establish website controls. Flow capabilities are a dated official consumer snapshot, not account UAT.
- Prompts cannot prove hidden geometry, actual 360 completion, silence or seamless looping. QC provides endpoint metrics and human review, not identity/pose/angle understanding; the near-last sample is approximate.
- Fixed uniform/steady rigid rotation leaves no motion freedom for A/B/C; identical core prompts are explicitly disclosed. Eased rotation and selected ambient/cinematic actions support real deterministic variants.
- Browser codec/storage/install behavior varies. Native Safari/iOS and Windows device installation, full accessibility/device UAT and optional real Flow/Grok video-quality trials remain manual. See docs/TESTING.md and docs/USER_GUIDE_ZH_HK.md.
- No provider automation, real 3D renderer, bot transport, Drive/Telegram connection or paid-generation service is part of this app.
