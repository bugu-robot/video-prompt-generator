# Development status

Branch: `feat/local-first-video-prompt-generator`. Draft PR pending first milestone publication. Main was initialized with a README only because the repository had no commits. All implementation is on the feature branch. No merge, deploy or visibility change.

## Milestone 1 — functional local workbench

Implemented shared typed plan, three compilers, three modes, camera/rotation separation, 23 presets, bilingual views, deterministic A/B/C, diagnostics, exports, custom storage, local source-image marking, browser video QC and PWA shell/update flow.

Official provider research completed on 2026-10-11. Consumer and API capabilities are distinct. Grok consumer details remain unknown; Flow models have version-specific gating.

Validation so far: typecheck and lint pass; initial production build passes; dependency audit reports 0 vulnerabilities; 131 engine tests pass. Browser, storage/schema/media regressions and final docs are in progress. A local browser executable has been found after the Playwright CDN download was blocked; browser claims will be based on actual tests, not the existence of a test file.

## Required before review handoff

- Complete schema/preset/media regression and browser suites.
- Verify offline root and Pages paths plus waiting-worker safe update.
- Re-run clean install, all required checks and production builds.
- Publish milestones and open/update Draft PR.
- Inspect actual GitHub Actions outcomes. Manual Windows/Safari installation and real-provider quality acceptance remain separate.
