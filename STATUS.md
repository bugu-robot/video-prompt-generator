# Development status

All six feasible implementation phases are complete on `feat/local-first-video-prompt-generator`. Draft PR [#1](https://github.com/bugu-robot/video-prompt-generator/pull/1) remains open and draft. Main was initialized with a README only because the repository had no commits; all application work is on the feature branch. No merge, deployment, visibility change or provider generation. Reference/Mochi repositories are untouched.

## Implemented

- Shared typed Motion Plan and three deterministic provider compilers, bilingual interpretation, ambient/rotation/cinematic modes, separate turntable/orbit, qualitative amplitude and relevant preservation.
- 23 complete data-driven presets and safe custom save/update/rename/duplicate/delete/import/export; deterministic A/B/C, provider comparison, original-English copy and versioned text/JSON exports.
- Source image validation/preview/metadata and pointer/keyboard subject region, with no vision claims or byte persistence. Local video decode/playback, first/near-last samples, RGB/luma metrics, manual pending checklist and report.
- Installable offline PWA for root/Pages, content-versioned cache, visible waiting updates and settings retention. No external runtime resources, AI calls, accounts or backend.
- Strict schema/example and documented future Mochi adapter preserving existing approval/kill switch. All requested engineering/provider/preset/loop/rotation/testing/Hong Kong Chinese user documents.

## Verification snapshot

| Environment | Verified outcome |
| --- | --- |
| Local Node 24 clean install | npm ci, typecheck, lint, root/Pages builds, audit pass; 0 vulnerabilities |
| Local unit suite after independent-review fixes | 221 pass, 0 fail/skip, 4 files |
| Actual local Chromium 153 | 42 browser tests pass, 0 fail/skip |
| Independently reviewed Ubuntu and Windows Node 24 CI baseline | 170 unit tests each plus typecheck/lint/root/Pages builds/audit pass |
| Independently reviewed Chromium / Firefox / WebKit CI baseline | 26 / 25 / 25 pass = 76; 0 fail/skip |

Independently reviewed baseline: commit `1f47146f8fb2500ed52093d0ce38bea52214af11`, [CI run](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38131499051). The follow-up adds 51 unit cases and 16 shared browser cases: the full suite now contains 221 units and Chromium 42 / Firefox 41 / WebKit 41 = 124 browser cases. Local outcomes above are measured; current remote outcomes must be verified from the feature branch's new PR checks.

## Independent-review fixes (2026-10-11)

- Preset write/export validates the exact final representation with a shared 1 MiB (1,048,576 UTF-8 bytes) limit and 100-item limit. An oversized merged import fails before the one atomic write, preserving existing bytes. Save/update/rename/delete/import require a successful existing-data read; malformed/oversized/schema-invalid data is never an empty fallback. Quota failures preserve prior contents, including when the startup write probe fails.
- The UI keeps unreadable preset data visible as a recovery state, disables ordinary mutation, offers exact raw backup and requires a downloaded backup plus explicit replacement confirmation for a validated recovery file. Validation/quota/stale-backup failures leave original data intact. Recovering a subset does not automatically migrate omitted entries; keep the raw backup.
- Rotation audits only emitted rigid turn/orbit motion, retaining dormant Ambient/Cinematic selections. Real conflicts return when those modes become active; base, A/B/C and comparison copy gates use their own actual plans.
- One-way 90°/180° turntable/orbit workflows suggest a distinct final orientation/viewpoint, no endpoint/no loop, or a separately designed return path/edit. Full revolutions and returning-pose plans keep appropriate identical-endpoint suggestions. Grok controls stay unknown; angle/direction/mechanics are never changed silently.
- Validated export mirrors compare semantically regardless of object-key order. Ordered arrays, strict values, schema/compiler/capability versions, canonical dates and English recompilation remain enforced. Schema/example version 1.0.0 is unchanged and its existing contract tests pass.

Real browser acceptance includes clipboard readback, H.264 decode, image privacy/region interaction, atomic imports, responsive layouts and real Service Worker root/Pages offline reload plus explicit waiting-worker update. Fixed CORS Vary cache matching, update-worker lifecycle, import notifications, source confirmation reset, axis convention and canonical dates. Final rotation-loop clauses never invent ambient movement or demand contradictory partial-turn closure.

Local Playwright CDN downloads were blocked; a separately provisioned Chromium was actually run. Firefox/WebKit results above are actual inspected GitHub CI logs, not simulated local success. CI artifact storage is full in the GitHub account; optional uploads fail visibly while all validation remains mandatory. No existing artifacts were deleted.

## Remaining limitations and manual acceptance

- Grok consumer I2V/model/duration/reference/audio details remain unverified; separate API evidence cannot establish website controls. Flow capabilities are a dated official consumer snapshot, not account UAT.
- Prompts cannot prove hidden geometry, actual 360 completion, silence or seamless looping. QC provides endpoint metrics and human review, not identity/pose/angle understanding; the near-last sample is approximate.
- Fixed uniform/steady rigid rotation leaves no motion freedom for A/B/C; identical core prompts are explicitly disclosed. Eased rotation and selected ambient/cinematic actions support real deterministic variants.
- Browser codec/storage/install behavior varies. Native Safari/iOS and Windows device installation, full accessibility/device UAT and optional real Flow/Grok video-quality trials remain manual. See docs/TESTING.md and docs/USER_GUIDE_ZH_HK.md.
- No provider automation, real 3D renderer, bot transport, Drive/Telegram connection or paid-generation service is part of this app.
