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

Browser acceptance covers main interactions, original-English copy, language/theme persistence, provider retention, rotation/orbit separation, warnings and disabled copy, pointer/keyboard subject region, local image validation/privacy, actual video decode/frames/checklists, custom JSON import/export, responsive 390/768/1440 layouts, keyboard focus and storage denial.

PWA tests exercise **real Service Workers**: root offline reload; Pages-base-path offline reload; manifest/icons; version waiting; visible user update; settings retained; old-cache cleanup. A test-only fixture server changes worker identity without external services. It is never part of the built app.

CI runs Node 24 checks on Ubuntu and Windows, then Chromium/Firefox/WebKit browser tests on Ubuntu. Review-artifact uploads are optional (3-day retention); the account's artifact quota can block them without suppressing any check or test failure. Results remain in job logs. There is no merge or deployment job. WebKit automation is not an assertion that native Safari/iOS installation has been manually accepted.

## Results at milestone 2

- 168 unit tests pass, 0 fail, 0 skip (3 files).
- 26 local Chromium browser tests pass, 0 fail, 0 skip, including native clipboard readback and real H.264 video decode.
- Typecheck/lint pass; root/Pages production builds pass; dependency audit currently reports 0 vulnerabilities.
- Local standard Playwright CDN downloads were unavailable; Chromium 153 was provisioned separately for the actual browser run via `VPG_CHROMIUM_PATH`. Firefox/WebKit claims require the real GitHub Actions results. This environment limitation is not represented as a passed browser check.
- Final clean-install results and CI outcome are recorded in STATUS.md at handoff.

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

1. Default UI is Traditional Chinese with English ambient-loop output. Select an existing Mochi image; verify filename, dimensions, aspect ratio and local preview.
2. Choose custom subject, provide English/Chinese Mochi descriptions and mark its position by mouse or keyboard. Confirm no AI scene analysis is claimed.
3. Select only motions actually visible/applicable. Inspect English/Chinese/side-by-side; copy from the Chinese view and paste into Notepad. It must be the English original.
4. Inspect A/B/C. A has fewer/sparser movements; C prolongs only the selected actions and retains the amplitude cap. Switch providers and verify camera/actions stay selected; unsupported preferences get an explicit finding.
5. Use Rotation, choose a subject and verify 360° turntable keeps camera fixed. Switch to Camera Orbit and verify the object is fixed. Try 90°/180° and confirm return-to-start clears; inspect reconstruction/completion reminders.
6. Save, update, rename, duplicate and delete custom presets. Export a batch, import it and verify original presets remain. Malformed JSON must fail without changing stored presets.
7. Export current English text and Motion Plan JSON. Import the JSON, confirm settings and original prompt recompile. Media must be reselected after reload.
8. Upload an existing MP4/WebM for QC. Verify real metadata/first/near-last samples, watch the full video and mark checklist items. Export the report; untouched items must remain pending.
9. Wait for **離線已就緒**. Install via browser UI if desired. Disable network or stop the preview server, then reload the already controlled app. Prompts, preset changes and media inspection should work. Restore network/start preview afterward.
10. Inspect 390 px mobile sizing via device tools, dark/light themes, keyboard Tab/Space/Enter and focus labels. Native iPhone/Safari installation is a separate device check.

## Optional real-provider acceptance — user initiated

Using existing Flow/Grok accounts, manually copy prompts and attach the selected source. Generation is **not** executed by the automated test suite.

| Trial | Source / intent | Observe |
| --- | --- | --- |
| Omni ambient | Existing Mochi rain-café image; blink or breath plus confirmed steam/rain; locked camera | Identity, small natural movement, stable framing, repeated loop boundary |
| Veo ambient | Same image, intent and an actually selectable consumer duration | Camera obedience, scene preservation, audio removal needs, endpoint continuity |
| Grok ambient | Same image; verify current website I2V/model/duration controls first | Whether actions/timing obey the prompt; record website capability evidence separately |
| 360 turntable | A clear product/object image with identifiable front/side markers | Actual full revolution across the timeline, stable geometry/scale and direction; matching endpoints alone do not pass |
| 180 orbit | Stationary object; camera travels halfway around | Object does not self-rotate; camera motion and scale stay coherent |
| Frame workflow | For a model with verified consumer first/last-frame support, manually attach suitable endpoints | Non-static motion between endpoints and actual repeated-play seam quality |

Start with one manually chosen representative prompt per trial. Record failures and provider UI differences rather than rerolling automatically. Precise 3D hidden surfaces, exact rotation completion, mathematically seamless loops and fully automatic identity QC remain outside the generator's guarantees.
