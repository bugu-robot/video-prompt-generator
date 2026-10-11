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
| Local unit suite after final review | 170 pass, 0 fail/skip, 3 files |
| Actual local Chromium 153 | 26 browser tests pass, 0 fail/skip |
| Ubuntu and Windows Node 24 CI baseline | 168 unit tests each plus typecheck/lint/root/Pages builds/audit pass |
| Chromium / Firefox / WebKit CI baseline | 26 / 25 / 25 pass = 76; 0 fail/skip |

Remote baseline: commit `cb3e624d04b6b04d2efb33ed70966bc2459459f9`, [CI run](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38130744331). Final review adds two unit regressions for rotation-loop edge cases and extends the existing browser rotation acceptance; the latest PR checks rerun all 170 unit tests and 76 browser tests. Inspect current results on the linked PR/Actions rather than treating this static snapshot as a live CI dashboard.

Real browser acceptance includes clipboard readback, H.264 decode, image privacy/region interaction, atomic imports, responsive layouts and real Service Worker root/Pages offline reload plus explicit waiting-worker update. Fixed CORS Vary cache matching, update-worker lifecycle, import notifications, source confirmation reset, axis convention and canonical dates. Final rotation-loop clauses never invent ambient movement or demand contradictory partial-turn closure.

Local Playwright CDN downloads were blocked; a separately provisioned Chromium was actually run. Firefox/WebKit results above are actual inspected GitHub CI logs, not simulated local success. CI artifact storage is full in the GitHub account; optional uploads fail visibly while all validation remains mandatory. No existing artifacts were deleted.

## Remaining limitations and manual acceptance

- Grok consumer I2V/model/duration/reference/audio details remain unverified; separate API evidence cannot establish website controls. Flow capabilities are a dated official consumer snapshot, not account UAT.
- Prompts cannot prove hidden geometry, actual 360 completion, silence or seamless looping. QC provides endpoint metrics and human review, not identity/pose/angle understanding; the near-last sample is approximate.
- Fixed uniform/steady rigid rotation leaves no motion freedom for A/B/C; identical core prompts are explicitly disclosed. Eased rotation and selected ambient/cinematic actions support real deterministic variants.
- Browser codec/storage/install behavior varies. Native Safari/iOS and Windows device installation, full accessibility/device UAT and optional real Flow/Grok video-quality trials remain manual. See docs/TESTING.md and docs/USER_GUIDE_ZH_HK.md.
- No provider automation, real 3D renderer, bot transport, Drive/Telegram connection or paid-generation service is part of this app.
