# Development status

Branch: `feat/local-first-video-prompt-generator`. Draft PR [#1](https://github.com/bugu-robot/video-prompt-generator/pull/1) is open. Main was initialized with a README only because the repository had no commits. All implementation is on the feature branch. No merge, deploy or visibility change.

## Milestone 1 — functional local workbench

Implemented shared typed plan, three compilers, three modes, camera/rotation separation, 23 presets, bilingual views, deterministic A/B/C, diagnostics, exports, custom storage, local source-image marking, browser video QC and PWA shell/update flow.

Official provider research completed on 2026-10-11. Consumer and API capabilities are distinct. Grok consumer details remain unknown; Flow models have version-specific gating.

## Milestone 2 — verified local acceptance and integration contract

- 168 unit regressions pass (3 files), 0 failures/skips; all catalog controls, provider compilers, strict schema/preset/media behavior and stable contract example covered.
- 26 real Chromium 153 browser tests pass, 0 failures/skips. Includes native original-English clipboard readback, real local H.264 frame extraction, root/Pages offline reload and explicit waiting-worker update with state retention.
- Fixed offline static cache matching across CORS Vary headers, captured worker lifecycle state for update notifications and preserved import success messages across renders.
- Reset element confirmation when the source/preset/motions change, disallow biological movement on declared inanimate subjects, preserve selected variation during provider switching, document clockwise axis convention and canonical timestamp validation.
- All required provider/formula/preset/loop/rotation/integration/user/testing docs and versioned JSON Schema/example now exist.
- Node 24 typecheck/lint, root/Pages builds and audit pass (0 vulnerabilities). Final clean npm ci/check and both builds completed successfully.
- CI now contains Ubuntu + Windows checks and Chromium/Firefox/WebKit acceptance; its actual remote outcome is pending publication/verification. No deployment workflow exists.
- Local browser CDN download was blocked; actual Chromium was provisioned separately. Firefox/WebKit results will be reported only after inspecting real CI. Native Safari/iOS install and real-provider quality remain manual.

## Required before review handoff

- Publish milestone 2 and inspect actual GitHub Actions outcomes.
- Record cross-platform/browser results and update this status and the Draft PR.
- Native Windows/Safari installation and real-provider video quality remain manual acceptance; zero generation credits have been consumed.
