# Testing and acceptance

## Current correction: compiler 1.2.0 / dismissible updates

**265 new unit cases**, total **739** in 8 files, cover all provider/group/density/ABC timing, every catalog action, dormant rotation, affirmative/negated camera directions/all copy plans, pure preset restoration, waiting-worker presentation and 27 fixed 1.1.0 exports with migration/tampering validation, plus 15 byte-immutability checks. Local units pass, 0 failed/skipped; clean npm ci/typecheck/lint/root/Pages/audit pass (0 vulnerabilities).

Eleven shared browser cases cover desktop/mobile interleaved preset edits, all-provider copy gates and cleared groups/comparison, Veo input roles, exact historical backup/adoption and five rapid native QC selections with stable input/last-file ownership. Two new real-SW cases cover dismissal/reopen, repeated foreground/online offers, image/QC position/notes/checklist/preset retention, explicit update cleanup and a genuinely newer worker. **93/92/92 = 277 native passes**, including **21 PWA** cases, are verified in corrected CI 38407379814. Native BFCache/privacy/storage/QC checks remain mandatory, with no retries/expected failures.

The host denies native dependencies and standard browser downloads yield invalid/truncated ZIPs. Accepted corrected native Actions execution is recorded below; later final-head outcomes are inspected separately. Earlier evidence below is historical.

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

CI runs Node 24 checks on Ubuntu and Windows, then Chromium/Firefox/WebKit browser tests on Ubuntu. Review-artifact uploads are optional (3-day retention); the account's artifact quota can block them without suppressing any check or test failure. Results remain in job logs. Standalone CI has no merge/deploy job; the existing separate publishing workflow now requires this complete reusable CI before its publish job. This correction does not trigger publishing. WebKit automation is not an assertion that native Safari/iOS installation has been manually accepted.

## Session-confirmation correction

Both legacy settings restoration and new settings persistence clear image/region/confirmation together; the active plan is not mutated when saving. Pagehide clears discarded-source state and refreshes the prior-plan snapshot; pageshow handles retired BFCache media and late browser form restoration without resetting a new manual confirmation. Existing presets and integration/compiler versions are unchanged.

Seven unit cases cover saved legacy true flags with/without metadata, safe writes preserving active intent/preset bytes, and valid new-session reconfirmation. Seven shared browser cases cover normal reload, legacy settings, root/Pages controlled offline reload, same-file replacement after reload, unrelated controls, real backward/forward navigation and explicit persisted lifecycle/form-restoration dispatch. Chromium uses full Chromium (`channel: chromium`) and removes the automation BFCache-disable argument; the real-history test requires `pageshow.persisted=true` and the same document marker. Firefox/WebKit record their actual native/fresh-document outcome and still assert the same confirmation/intent/preset behavior; the explicit persisted handler runs on all engines. Synthetic dispatch is not described as native BFCache evidence.

Playwright explicitly [does not support native BFCache through Page.goBack/goForward](https://playwright.dev/docs/api/class-page#page-go-back): cached documents do not fire a new network lifecycle and can desynchronize its Page state. The Chromium history phase therefore uses the documented DevTools [Page navigation history](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-navigateToHistoryEntry) and [Runtime.evaluate](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-evaluate) against the current live realm. It still asserts native persistence, unchanged document identity, cleared UI/source/region, retained settings/motions/preset bytes, valid reconfirmation and a second forward/back reset. The real export Blob is observed without altering bytes, download or disposal, so the check verifies active Motion Plan intent rather than checkbox appearance alone. No application hooks or synthetic native-cache events are added.

Every history-phase JSON export must finish its actual download before the next traversal. Firefox/WebKit read the completed download using the normal export helper; Chromium observes the unmodified native-realm Blob and also awaits the download's completed path. This prevents a delayed prior download-start event being mistaken for a new navigation. No sleep, retry, ignored download error or native-cache fallback is used.

After that synchronization fix, a deliberate local Firefox stress run (`--grep 'real backward/forward' --repeat-each=10`) passed **10 independent executions**, 0 failures, in 20.4 seconds. These are additional executions, not extra logical suite cases or failure retries; CI still has `retries: 0` and the complete 202-case suite.

Actual inspected focused [CI run 38158981283](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38158981283), commit `a772eb99624b9e70a133bdc532f4c2aa4a6d997b`, **completed successfully**: Windows/Ubuntu each pass **474 units in 7 files**, clean npm ci/typecheck/lint/root/Pages builds/audit (**0 vulnerabilities**). Chromium **68** + Firefox **67** + WebKit **67** = **202 passed**, **0 failed/skipped**, 10.2 minutes, including **15** real controlled PWA/offline cases. Chromium's actual log records `pageshow.persisted=true`; the test also asserts unchanged document identity. Firefox/WebKit log their fresh-document outcome. All previous privacy/preset-storage/migration/QC cases pass. Both optional artifact uploads failed their storage quota, not mandatory validation. First focused run 38149834045's 201 passes / 1 native-navigation wait failure remains recorded in STATUS.md; no test was disabled or weakened to resolve it.

Local clean checks pass with 474 units; corrected complete Firefox passes **67**, 0 fail/skip, 58.4 seconds. Full Chromium is blocked by the managed host's Unix-socket policy; Headless Shell cannot meet the native-cache assertion. WebKit lacks local system dependencies. These launch/native-cache failures are not accepted passes; CI's actual complete results supply that acceptance. Sequential local runner invocations avoid shared report-directory collisions; CI uses one complete cross-browser invocation. Documentation follow-ups run the same workflow; latest-HEAD conclusions are recorded on Draft PR #1 after inspection.

## Earlier compiler 1.1.0 remediation coverage

- Every declared conflict becomes one undirected pair; both selection orders are tested across all providers and Ambient/Cinematic base, A/B/C and comparison plans, plus retained dormant rotation behavior.
- Provider tests remove openings/titles/whitespace to check substantive action syntax and priority, and compare equivalent plans. Density tests cover all selected action verbs, source conditions, camera/identity/preservation, both rotation types/angles/directions/axes and relevant continuity.
- Historical-version validation: 27 immutable provider/mode/density exports, unchanged old fixture, current fixture, explicit migration, exact original backup, lossy-normalization rejection, canonical dates, mirrored/key-order values and tampered prompts/warnings/versions. A mocked later capability date verifies old/new snapshots independently without relaxing pair validation.
- Confirmation tests cover subject descriptions/type, scene notes, adding/removing motions, image/region changes and unchanged unrelated controls. Real browser tests include same-file replacement and prompt conditions.
- Real browser QC tests retain the same live HTMLVideoElement with no emptied event, playing/paused position/speed, notes/checklist and report across text/full/provider/language/density rendering; replacement, rapid selection and Blob disposal are tested. Media bytes/URLs are never persisted or uploaded.

Earlier verified local suite: **467 units**, 0 fail/skip (6 files), **61 Chromium passes** in 35.2 seconds and **60 Firefox passes** in 49.1 seconds, 0 fail/skip (19 new shared browser cases). Typecheck/lint/root/Pages builds/audit pass. Firefox initially encountered managed-host sandbox/decoder restrictions; the final complete run uses test-process-only `MOZ_DISABLE_CONTENT_SANDBOX=1 MOZ_DISABLE_RDD_SANDBOX=1 MOZ_DISABLE_GMP_SANDBOX=1`, without application/test changes. Local WebKit was attempted but cannot launch: it lacks system libraries and native dependency installation is blocked by the managed host. That launch failure is not counted as a pass. CI installs required dependencies on its Ubuntu runner and uses the normal Playwright browser configuration.

Actual inspected code-fix [CI run 38143409461](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38143409461), commit `71c318becf6a12e44af3be2126caf2e80195fca2`, **completed successfully**. Ubuntu and Windows each pass **467 units**, clean npm ci/typecheck/lint/root build/Pages build/audit (**0 vulnerabilities**). Browser log confirms **Chromium 61 + Firefox 60 + WebKit 60 = 181 passed**, **0 failed/skipped**, in **8.7 minutes**, including all **9 real PWA root/Pages/offline/update cases**. Original privacy/preset-storage tests and all new playback/confirmation/migration/conflict tests pass. Both optional static-review/browser-report uploads **failed** with artifact-storage quota; mandatory validation remains enforced. Later documentation-only pushes run the same complete workflow; final-head evidence is reported on Draft PR #1.

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

## Preset Undo and non-destructive reset regression

The additional `tests/e2e/preset-undo.spec.ts` verifies in all three Playwright browsers:

- A built-in preset can be applied then toggled off to restore the immediately prior configuration, preserving the loaded local image and selected provider.
- Subject and environmental motions can be cleared independently, and Undo restores the exact previous motion selection.
- A motion-only reset clears motion/camera controls without discarding the current image, subject description or provider.
- Manual motion edits remove misleading preset selection; Undo can reselect the prior preset, including its reversible pre-apply snapshot.
- Removing an image clears Undo history so no discarded image metadata can be resurrected; reload starts a fresh history.
- The same actions remain available in a 390 px mobile viewport.

Undo is session-only, bounded to 30 edits and grouped for rapid consecutive text input; image replacement/removal and history navigation invalidate stale undo/preset restoration. These checks do not call Flow, Veo or Grok or consume generation credits.

## Windows product UAT

以下是唯一整合版 **Windows 無額度 UAT**，使用 Chrome／Edge；不登入 Flow／Grok、不生成影片。先安裝 Node.js 24 LTS 及 Git，保留你本機尚未提交的修改，不要用 reset 強行切換分支。

```powershell
# 首次使用才需 clone；已有 repo 則進入原資料夾
# git clone https://github.com/bugu-robot/video-prompt-generator.git
# cd video-prompt-generator
git fetch origin
git switch fix/review-remediation-update-dismiss
git pull --ff-only
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run build:pages
npm audit
npm run preview -- --port 4173 --strictPort
```

開啟 **http://127.0.0.1:4173/**，保留 PowerShell 執行中。檔案／自訂預設只屬這個 localhost 來源，不會更改你正式網站的瀏覽器資料。

1. **基本與複製**：選本機圖片，填寫主體，選適用動作；切換英文／繁中／對照。從繁中模式複製到 Notepad，必須是英文原文。
2. **動作及密度**：同一意圖比較 Omni／Veo／Grok 及 Concise／Balanced／Detailed。清空環境，只選眨眼：base／A/B/C／比較不可加入環境動作。清空主體，只選蒸氣：不可加入角色手勢或短動作節奏。所選動作、鏡頭及身份保留仍須存在。
3. **鏡頭檢查**：Locked 加入 `Keep the camera locked. No pan, no dolly, no push-in.`，所有複製路徑保持可用。換成 `Pan the camera slowly.`，base／A/B/C／比較須阻擋；完成後刪掉衝突文字。
4. **預設交錯編輯**：先儲存自訂預設，再套用 nature-breeze；改供應商、主體描述及長度，按同一預設取消。後來的修改、原圖及自訂資料須保留，動作恢復套用前。分別清空主體／環境、復原上一步、只重設動作：不可刪另一組、原圖或已儲存預設。
5. **確認與導航**：確認元素後改主體、描述、場景補充、動作或框選，確認須清除；重新確認後改供應商／長度／語言／主題等無關設定，確認保留。同檔換圖仍須重確認。重載、前往本機 icon 再 Back／Forward：已退役圖／框選／確認不可復活；動作及預設保留，新會話可重新確認。
6. **衝突與 Rotation**：sleep 配 breathing／blink／look／gesture，兩種選取次序均有一項衝突且阻擋複製。換到有效 Product Rotation，休眠中的微動作不可輸出或阻擋；返回 Ambient／Cinematic，衝突恢復。
7. **旋轉與輸入角色**：比較物件自轉／鏡頭繞行、90／180／360、角度／方向／軸／速度。部分轉動不可同時要求回起點或相同尾幀；幾何約束及限制提示保留。Veo Fast 8 秒 References opening 是同物件多視角參考，不聲稱已設定首幀；single 回復首幀文字。不可憑首尾幀相似判定實際轉足一圈。
8. **儲存與遷移**：預設匯出／匯入後原資料保留；格式錯誤、超限或 quota 失敗不可覆蓋舊資料。不可讀資料先保存原文備份，只有明確確認才復原。匯入 1.0.0 及 1.1.0 範例，比較舊／新 1.2.0，先下載 byte-exact 原檔、取消，再明確採用。未採用前設定不變；新匯出用 1.2.0，須重選圖／確認。改動舊 prompt／warnings 或未知版本須拒絕；當前範例可直接 round-trip。
9. **QC 與快速換片**：選 MP4／WebM，seek 後暫停，填備註及 checklist；改 prompt／供應商／模型／長度／語言／預設，播放位置及記錄不重設。播放中重試亦須持續。快速連續選不同影片，最終只顯示最後選取；重新開啟 chooser 可重選同檔。清除 QC 只退役影片及檢查，不改圖片／預設。匯出不含影片／擷取圖 bytes，未檢項目保持 pending。
10. **離線與手機尺寸**：待「離線已就緒」，停止 preview／關網絡，再重載：prompt／預設可用，但圖／region／確認須清除；新會話可重選／確認。恢復網絡。390 px、明暗主題、鍵盤及 focus 不應橫向溢出。Pages base path 用 `npm run preview -- --outDir dist-pages --base /video-prompt-generator/ --port 4174 --strictPort`，開 http://127.0.0.1:4174/video-prompt-generator/ 重複離線檢查。
11. **更新關閉與 QC 保留**：另一 PowerShell 執行 `node --experimental-strip-types tests/update-server.ts`，開 http://127.0.0.1:4191/ 並等離線就緒；選圖／片、seek／暫停、填 QC、存預設。第三個 PowerShell 執行 `Invoke-WebRequest http://127.0.0.1:4191/__test/update | Out-Null`，返回瀏覽器前景等待提示。按「稍後／關閉」（亦試 Enter）：不可重載或重設媒體／QC／預設。改設定及離開再回前景，同一版本仍關閉；「查看更新」可重開。只有「儲存設定並更新」才套用：設定／預設留，圖片／影片／確認按會話規則清除。
12. **另一新版本**：呼叫 `Invoke-WebRequest http://127.0.0.1:4191/__test/reset | Out-Null` 後，以新瀏覽器會話重做 offer／dismiss；再呼叫 `Invoke-WebRequest http://127.0.0.1:4191/__test/newer | Out-Null` 並回前景。真正另一版本可再次提示，但仍不能自動套用。這只是本機 test fixture，沒有供應商操作，也不部署。真正 iPhone／Safari 安裝與背景行為仍需實機驗收；目前正式網站未更新，須另行批准 merge／部署。

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

The initial correction PR run 38403664900 failed (264/10), and independent push run 38403660197 failed (265/9); neither is accepted. All 21 PWA cases passed in both. The comparison harness now explicitly expands the panel and checks visible text; native QC inputs are retained through asynchronous completion, with an additional latest-selection/retired-selection regression. All old cancellation, playback and privacy assertions remain mandatory. Full corrected native CI is required; no failure retry, skipped test or expected-failure marking is used.

## Accepted corrected native CI

[Corrected code CI 38407379814](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38407379814) at `b3a43b03f92d9eee857e4171b6247015fdd4859c` **completed successfully**. Inspected Windows/Ubuntu logs each show clean npm ci, typecheck/lint, **739 unit passes** in 8 files, root/Pages builds and audit **0 vulnerabilities**. Native browser log: **Chromium 93 / Firefox 92 / WebKit 92 = 277 passed**, **0 failed/skipped**, 6.2 minutes, including **21 real PWA cases** and all privacy/preset/migration/QC cases. Native Chromium again asserts `pageshow.persisted=true`; Firefox/WebKit report fresh-document restoration. Both new waiting-update cases and permanent-input/five-selection regression pass on every engine. The independent push run 38407373611 also concluded success. No retries/expected failures/test weakening. Intermediate 0df45a3 runs 38406648752/38406641934 were superseded/cancelled, not accepted passes. Optional artifacts uploaded successfully in the accepted PR run; prior quota failures remain historical.
