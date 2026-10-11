# Testing and acceptance

All automated tests are offline/local and consume **zero provider-generation credits**. Test image/video fixtures are synthetic local files. No provider login is needed. No critical test is conditionally skipped; Chromium-only clipboard readback is an additional explicitly scoped test.

## Commands

Use Node.js 24 LTS:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run build:pages
npm audit
npx playwright install chromium firefox webkit
npm run test:e2e
```

Unit contracts cover normalization, all motion/camera/preservation catalogs, three compilers, loop and rotation rules, actual A/B/C timing, strict import and mirrored fields, custom preset lifecycle/atomicity, unsafe/oversized JSON, image magic bytes, metadata, metrics and published schema/example consistency.

Independent-review regressions add 51 unit cases. They reproduce two separately valid 30-preset imports whose aggregate exceeds 1 MiB, exact UTF-8 limits/Chinese/emoji, a final serialized bundle exactly at the limit, rejected saves above it, unreadable raw preservation across save/update/rename/delete/import, read denial and quota failures (including the startup write probe), raw backup/validated recovery/stale-backup rejection. They also cover all providers and turntable/orbit base/A/B/C/comparison audits, restored Ambient/Cinematic conflicts, all four partial-angle/type combinations for every Flow model and unverified Grok, retained full-turn/returning-pose advice, recursively reordered object mirrors, ordered arrays and retained strict compiler/version/date/prompt checks. Fixture batches are generated rather than stored as huge files.

Browser acceptance covers main interactions, original-English copy, language/theme persistence, provider retention, rotation/orbit separation, warnings and disabled copy, pointer/keyboard subject region, local image validation/privacy, actual video decode/frames/checklists, custom JSON import/export, responsive 390/768/1440 layouts, keyboard focus and storage denial.

Sixteen additional shared browser cases exercise the aggregate import failure then reload/save, malformed and oversized existing-data protection with exact downloaded raw backup and explicit recovery, a localStorage quota exception, all-provider/type copy gates before/after mode switches, all model families' 90°/180° turntable/orbit endpoint guidance and key-order-compatible configuration import. They run on Chromium, Firefox and WebKit; no provider interaction is involved.

PWA tests exercise **real Service Workers**: root offline reload; Pages-base-path offline reload; manifest/icons; version waiting; visible user update; settings retained; old-cache cleanup. A test-only fixture server changes worker identity without external services. It is never part of the built app.

CI runs Node 24 checks on Ubuntu and Windows, then Chromium/Firefox/WebKit browser tests on Ubuntu. Review-artifact uploads are optional (3-day retention); the account's artifact quota can block them without suppressing any check or test failure. Results remain in job logs. There is no merge or deployment job. WebKit automation is not an assertion that native Safari/iOS installation has been manually accepted.

## Compiler 1.1.0 remediation coverage

- Every declared conflict becomes one undirected pair; both selection orders are tested across all providers and Ambient/Cinematic base, A/B/C and comparison plans, plus retained dormant rotation behavior.
- Provider tests remove openings/titles/whitespace to check substantive action syntax and priority, and compare equivalent plans. Density tests cover all selected action verbs, source conditions, camera/identity/preservation, both rotation types/angles/directions/axes and relevant continuity.
- Historical-version validation: 27 immutable provider/mode/density exports, unchanged old fixture, current fixture, explicit migration, exact original backup, lossy-normalization rejection, canonical dates, mirrored/key-order values and tampered prompts/warnings/versions. A mocked later capability date verifies old/new snapshots independently without relaxing pair validation.
- Confirmation tests cover subject descriptions/type, scene notes, adding/removing motions, image/region changes and unchanged unrelated controls. Real browser tests include same-file replacement and prompt conditions.
- Real browser QC tests retain the same live HTMLVideoElement with no emptied event, playing/paused position/speed, notes/checklist and report across text/full/provider/language/density rendering; replacement, rapid selection and Blob disposal are tested. Media bytes/URLs are never persisted or uploaded.

Current local suite: **467 units**, 0 fail/skip (6 files), and **61 Chromium passes**, 0 fail/skip (19 new shared browser cases). Current complete cross-browser suite contains Chromium 61 + Firefox 60 + WebKit 60 = **181** cases; final remote outcomes must be checked at the pushed revision. Typecheck/lint/root/Pages builds/audit pass. Later source follow-ups rerun affected/full checks before handoff. Local WebKit lacks system libraries and native dependency installation is blocked by the managed host; local Firefox launch is not accepted as a pass. CI installs required dependencies on its Ubuntu runner.

## Earlier verification history

- 221 unit tests pass, 0 fail, 0 skip (4 files), after the independent-review fixes.
- 42 local Chromium browser tests pass, 0 fail, 0 skip, including native clipboard readback, all new review regressions and real H.264 video decode.
- Typecheck/lint pass; root/Pages production builds pass; dependency audit currently reports 0 vulnerabilities.
- Local standard Playwright CDN downloads were unavailable; Chromium 153 was provisioned separately for the actual browser run via `VPG_CHROMIUM_PATH`. Firefox/WebKit claims require the real GitHub Actions results. This environment limitation is not represented as a passed browser check.
- Final clean install completed successfully. Schema/example contract tests pass without changing version 1.0.0.
- Actual inspected independently reviewed CI baseline at `1f47146f8fb2500ed52093d0ce38bea52214af11`: Ubuntu and Windows each passed 170 units and all build/tool/audit checks; Chromium 26 + Firefox 25 + WebKit 25 = **76 passed, 0 failed/skipped**. [Evidence run](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38131499051).
- Review-fix commit `ca6840e34a9ffb94b3dad04328cb9de89cbfddb1`: [CI run 38138096115](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38138096115) completed successfully. Actual inspected Windows and Ubuntu logs each show **221 unit passes, 0 failures/skips**, clean install/typecheck/lint/root/Pages builds and **0 audit vulnerabilities**. Actual browser log shows **Chromium 42 + Firefox 41 + WebKit 41 = 124 passed, 0 failed/skipped** (3.9 minutes). The original browser cases remain in the suite.
- At that earlier revision every push/PR reran the complete 221-unit / 124-browser suite, including later documentation-only commits. Current-head outcomes are attached to the Draft PR; STATUS.md records the verified code snapshot.
- GitHub artifact storage quota blocked both optional Ubuntu static-review and browser-report uploads in this run. They did **not** succeed. Mandatory validation passed; no validation test is optional, Windows intentionally has no static-artifact upload and no existing account artifacts were deleted.

## Windows product UAT

Use your existing repository access; the application itself needs no account:

```powershell
git clone https://github.com/bugu-robot/video-prompt-generator.git
cd video-prompt-generator
git switch feat/local-first-video-prompt-generator
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --port 4173 --strictPort
```

Open **http://127.0.0.1:4173/** in Chrome or Edge. Keep the PowerShell process running while first loading/installing.

This is one consolidated **no-credit** UAT; no Flow/Grok login or generation is needed.

1. Load an existing Mochi image, choose Custom, enter English/Chinese subject descriptions and select only visible/applicable motions. Check local preview/metadata and English/Chinese/bilingual display. Copy from Chinese view into Notepad: it must be the English original.
2. Compare Omni/Veo/Grok from the same plan: Omni leads with main motion, Veo camera/shot hierarchy, Grok direct action/timing. Select Concise/Balanced/Detailed: clauses should actually shorten or add relevant temporal guidance while all selected actions and camera/identity constraints remain.
3. Confirm elements, then change subject type, either description, scene notes, motion membership (including removal), source image or region: confirmation must clear and conditional wording return. Reconfirm and change provider/language/density/intensity/camera: it must stay checked. Same-image replacement, preset loading and configuration import still require reconfirmation.
4. Select only sleep plus breathing (also repeat with blink/look/gesture). Set either as primary. Verify one conflict and disabled base/A/B/C/comparison copy buttons while active. Switch to valid Product Rotation: dormant biological actions must neither appear nor block; return to Ambient/Cinematic and the stored conflict must return.
5. Compare 360 turntable (object moves, camera fixed) with orbit (object fixed, camera moves). Try one-way 90/180: no return-to-start/identical-end-frame advice; a distinct endpoint or no-loop/editing guidance is shown. Geometry/direction/axis/scale remain in all lengths; completion and hidden-surface warnings remain.
6. Save/update/rename/duplicate/delete presets; export/import a batch without losing originals. Invalid/oversized merges must leave prior data intact, including reload/later save. For unreadable old data, download the raw backup and use only the explicitly confirmed validated recovery route; failed recovery keeps original bytes. Aggregate UTF-8 limit stays 1 MiB/100 presets.
7. Import `docs/motion-plan-export.example.json`: do not change current settings before review. Compare original 1.0.0 prompt and new 1.1.0 prompt, download original JSON (unchanged), cancel once, reimport and explicitly accept. Reselect image/reconfirm elements. New JSON must have compiler 1.1.0/new prompt/current findings; original backup remains original. Current fixture/current exports round-trip without a migration prompt. A modified historical prompt must fail without changing settings. Unknown versions remain rejected.
8. Load a local MP4/WebM for QC, seek partway and pause; enter notes and checklist decisions. Edit the prompt, switch provider/model/language/density/presets and check position/notes/checklist remain. Resume playback and repeat; it must continue without reset. Export QC report; pending items stay pending. Choose another video/clear QC to release the old media and reset only the old QC.
9. Wait for **離線已就緒**, install via browser UI if desired, stop preview/disable network and reload the already controlled app. Prompt, presets and reselected local media must still work. Restart preview/network afterward. Repeat Pages build locally if base-path UAT is needed: `npm run build:pages`, then `npm run preview -- --outDir dist-pages --base /video-prompt-generator/ --port 4174 --strictPort`; open http://127.0.0.1:4174/video-prompt-generator/.
10. Check 390 px device sizing, dark/light themes, keyboard controls and focus. Native iPhone/Safari installation remains a separate device check. An actual PWA update intentionally reloads; local media must be reselected, while settings/presets remain.

## Optional real-provider acceptance — user initiated

Using existing Flow/Grok accounts, manually copy prompts and attach the selected source. Generation is **not** executed by the automated test suite.

| Trial | Source / intent | Observe |
| --- | --- | --- |
| Omni ambient | Existing Mochi rain-café image; blink or breath plus confirmed steam/rain; locked camera | Identity, small natural movement, stable framing, repeated loop boundary |
| Veo ambient | Same image, intent and an actually selectable consumer duration | Camera obedience, scene preservation, audio removal needs, endpoint continuity |
| Grok ambient | Same image; verify current website I2V/model/duration controls first | Whether actions/timing obey the prompt; record website capability evidence separately |
| 360 turntable | A clear product/object image with identifiable front/side markers | Actual full revolution across the timeline, stable geometry/scale and direction; matching endpoints alone do not pass |
| 180 orbit | Stationary object; camera travels halfway around | Object does not self-rotate; camera motion and scale stay coherent |
| Frame workflow | For a confirmed Flow consumer workflow, use matching endpoints only for a full turn/returning pose; use distinct final orientation/viewpoint for a one-way 90°/180° turn/orbit | Endpoints agree with the selected path, no unwanted return leg; partial turns do not become loops without separately designed editing/return motion. Grok controls require separate verification. |

Start with one manually chosen representative prompt per trial. Record failures and provider UI differences rather than rerolling automatically. Precise 3D hidden surfaces, exact rotation completion, mathematically seamless loops and fully automatic identity QC remain outside the generator's guarantees.
