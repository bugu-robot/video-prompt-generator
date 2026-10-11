# 獨立審核修正交接（compiler 1.1.0）

Repo：bugu-robot/video-prompt-generator。分支：`feat/local-first-video-prompt-generator`。Draft PR：[#1](https://github.com/bugu-robot/video-prompt-generator/pull/1)。本次 focused P2 基線：`da2a573d79b1f91e1cd8ef0e0fc2c7990b2ff06b`；上一輪六項修正基線：`8858a181d116668ce9b78938b33d6b0724773411`。

上一輪修正提交：[71c318be](https://github.com/bugu-robot/video-prompt-generator/commit/71c318becf6a12e44af3be2126caf2e80195fca2)。本次來源會話修正：[9f90c4b2](https://github.com/bugu-robot/video-prompt-generator/commit/9f90c4b2bc2e5b52dc1cacd46fa728961d075f9a)，原生 BFCache 測試修正：[a772eb99](https://github.com/bugu-robot/video-prompt-generator/commit/a772eb99624b9e70a133bdc532f4c2aa4a6d997b)。沒有修改 main、合併、部署、登入供應商、提交生成或消耗額度；reference／Mochi repositories 未修改。

## 本次 focused P2：重載／歷史還原的來源確認

本次基線為 `da2a573d79b1f91e1cd8ef0e0fc2c7990b2ff06b`。設定保存與讀取現在同時清除圖片 metadata、框選及確認；保存不改當前有效確認。pagehide 清除來源會話及舊框選操作，pageshow 防止沒有圖片時還原確認，並同步瀏覽器的表單狀態及 previous-plan snapshot。新會話可重新確認，同一會話內的無關改動仍保留確認。預設、動作、供應商編譯、版本遷移和 QC 播放修正保留。

新增 7 單元／7 共用瀏覽器案例。實際核對 [CI run 38158981283](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38158981283)（`a772eb99624b9e70a133bdc532f4c2aa4a6d997b`），conclusion **success**：Windows／Ubuntu 各 **474 單元通過（7 files）**，clean npm ci／typecheck／lint／root 與 Pages builds／audit **0 漏洞**。Chromium **68**／Firefox **67**／WebKit **67**，共 **202 個通過，0 失敗／跳過，10.2 分鐘**，含 **15 個真實 controlled PWA／離線案例**，以及原有私隱、preset、遷移和 QC 回歸。Chromium 原生歷史還原 log 有 `pageshow.persisted=true`，且測試要求同一 document marker；Firefox／WebKit 記錄實際 fresh-document 還原。Dispatched persisted handler 另作測試，沒有把 synthetic event 冒充原生還原。

本機 clean checks／474 units／兩種 builds／audit 0 漏洞通過；修正後完整 Firefox **67 通過，0 失敗／跳過，58.4 秒**。本機完整 Chromium 受 Unix socket 政策阻擋，Headless Shell 的 native-cache assertion 不會放寬；WebKit 缺系統依賴。這些本機失敗不是通過證據，三瀏覽器驗收以實際 CI 完整結果為準。首輪 [38149834045](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38149834045) 的 **201 通過／1 失敗**仍於 STATUS 記錄：Playwright 等待 BFCache 不會重新發出的 load，已改用真實 CDP 歷史／當前 realm 及未改動的匯出 Blob 驗證，不跳過／削弱測試。兩個 optional artifact 上傳因配額已滿失敗，mandatory jobs 全過；沒有刪舊 artifacts。文件提交同樣跑完整 CI，最終 HEAD 結果核對後更新 Draft PR #1。

相對本次已審核基線修改 13 個檔案：

- `README.md`
- `STATUS.md`
- `ARCHITECTURE.md`
- `docs/TESTING.md`
- `docs/USER_GUIDE_ZH_HK.md`
- `docs/MOCHI_BOT_INTEGRATION.md`
- `docs/REMEDIATION_HANDOFF.md`
- `src/engine/source-confirmation.ts`
- `src/storage/local-storage.ts`
- `src/ui/app.ts`
- `tests/unit/source-session.test.ts`
- `tests/e2e/source-session.spec.ts`
- `tests/update-server.ts`

## 上一輪已完成修正

1. **供應商編譯**：共用 typed Motion Plan／MotionCue 和約束；Omni 主要動作先行、自然並行敘述，Veo 鏡頭／主次動作／時間連續性，Grok 直接動畫動作與相鄰時長。改變句式及優先次序，不只是標題。[規則及官方引用](PROMPT_FORMULAS.md)；這些編排是工程推導，沒有宣稱實際影片改善已驗收。
2. **動作衝突**：所有宣告按無方向配對去重；sleep 與 breathing／blink／look／gesture 的兩種選擇次序均測試。真正生效的原設定、A/B/C 及比較輸出會禁止複製；Rotation 保留休眠選擇且不誤報。
3. **長度模式**：精簡縮短真正句子、平衡保留完整控制、詳細加入相符的中間姿勢／旋轉進程；已選動作、鏡頭、身份及角度／方向／軸／幾何不因長度而被刪除。
4. **匯出遷移**：v1 plan/schema 及舊 fixture 保留；不可變 v1 compiler／審核／能力快照驗證舊 prompt。只接受已登記版本組合；先比較原 prompt 和新 prompt，再明確確認。原檔可逐 byte 備份，新匯出以 1.1.0 標明新 prompt／審核。未知或改動資料拒絕；有損意圖變更不會自動正常化。Custom preset 結構、UTF-8 上限和 atomic protection 不變。
5. **來源確認**：主體、描述、場景補充、動作新增／取消、圖片／框選改動會清除確認；provider、語言、長度、鏡頭等無關操作保留。換入相同檔案、預設及設定匯入須重確認。
6. **QC 狀態**：一般渲染不移動或重建實際 video element；播放位置／狀態／速度、備註、checklist 保留。換片／清除／離開才取消舊解碼、卸載播放並釋放 Blob URL；沒有儲存或外傳媒體 bytes。

## 上一輪已完成驗證

本機 clean npm ci、typecheck、lint、**467 單元測試（6 files，0 失敗／跳過）**、**61 Chromium／60 Firefox 測試（0 失敗／跳過）**、root／Pages builds 及 audit **0 漏洞**通過。

修正提交的 [CI run 38143409461](https://github.com/bugu-robot/video-prompt-generator/actions/runs/38143409461) 已完成，conclusion **success**。實際 Windows／Ubuntu logs 各有 **467 單元測試通過**，clean install、typecheck、lint、root／Pages builds 及 audit **0 漏洞**。三瀏覽器 log 有 **Chromium 61／Firefox 60／WebKit 60，共 181 個通過，0 失敗／跳過，8.7 分鐘**，包括 **9 個真實 Service Worker 離線／更新測試**。最終文件提交也會跑完整 workflow，其 HEAD 結果於核對後寫入 Draft PR #1；這裡固定記錄已驗證的程式提交。

新增 246 單元案例及 19 共用瀏覽器案例；27 份固定歷史匯出、原 v1 示例及新版示例均做契約驗證。原有離線 SW、Pages base path、更新通知、預設損壞／配額保護、媒體私隱及英文複製測試保留。

本機 Firefox 的主機 sandbox／解碼限制已由測試程序環境設定解決，完整重跑通過；沒有改動程式或測試要求。WebKit 系統依賴不足仍阻擋本機啟動，其完整 60 個通過來自遠端 CI。當前 run 的 static-review／browser-report 兩個 optional artifact 上傳均因帳戶配額已滿失敗，**沒有成功上傳**；沒有刪除舊 artifacts，也沒有放寬 mandatory checks。

## 一套 Windows UAT

Node.js 24 LTS／Git。在現有 repo 的 PowerShell 執行：

```powershell
git fetch origin
git switch feat/local-first-video-prompt-generator
git pull --ff-only
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --port 4173 --strictPort
```

用 Chrome／Edge 開啟 http://127.0.0.1:4173/，保持 preview 運行。依 [docs/TESTING.md 的一套無額度 Windows UAT](TESTING.md#windows-product-uat) 完成以下順序：本機 Mochi 圖／英文複製 → 三供應商及三種長度 → 確認重設及無關操作保留（包括重載／Back／Forward） → 四組 sleep 衝突及 Rotation 休眠 → 自轉／繞拍／部分轉動 → presets 匯入／配額／損壞備份 → 舊設定比較／取消／確認／原檔備份 → QC 播放與狀態保留／換片 → 安裝／root 及 Pages 離線 → 手機尺寸／主題／鍵盤。

這套 UAT 不需要 Flow／Grok 登入或生成。實際供應商影片品質、Grok 未核實控制項、原生 Safari／iOS 安裝另由用戶選擇驗收；沒有為此消耗任何額度。

## 上一輪修改檔案

上一輪相對 `8858a181` 基線共修改 **45 個檔案**：修正提交 44 個，以及本交接文件；後續驗證只更新已列文件。`legacy-v1` 是凍結的歷史驗證副本；其舊規則不會控制新生成或複製。列表：

- `ARCHITECTURE.md`
- `README.md`
- `STATUS.md`
- `docs/LOOP_BEST_PRACTICES.md`
- `docs/MOCHI_BOT_INTEGRATION.md`
- `docs/PROMPT_FORMULAS.md`
- `docs/PROVIDER_CAPABILITIES.md`
- `docs/PROVIDER_PROMPT_BEST_PRACTICES.md`
- `docs/REMEDIATION_HANDOFF.md`
- `docs/TESTING.md`
- `docs/USER_GUIDE_ZH_HK.md`
- `docs/motion-plan-export.current.example.json`
- `docs/motion-plan-export.schema.json`
- `src/engine/compilers/common.ts`
- `src/engine/compilers/grok.ts`
- `src/engine/compilers/omni.ts`
- `src/engine/compilers/veo.ts`
- `src/engine/intent.ts`
- `src/engine/loop-rules.ts`
- `src/engine/quality-check.ts`
- `src/engine/source-confirmation.ts`
- `src/storage/export-profiles.ts`
- `src/storage/export.ts`
- `src/storage/legacy-v1/README.md`
- `src/storage/legacy-v1/data/cameras.ts`
- `src/storage/legacy-v1/data/motions.ts`
- `src/storage/legacy-v1/engine/compile.ts`
- `src/storage/legacy-v1/engine/compilers/common.ts`
- `src/storage/legacy-v1/engine/compilers/grok.ts`
- `src/storage/legacy-v1/engine/compilers/omni.ts`
- `src/storage/legacy-v1/engine/compilers/veo.ts`
- `src/storage/legacy-v1/engine/intent.ts`
- `src/storage/legacy-v1/engine/loop-rules.ts`
- `src/storage/legacy-v1/engine/motion-planner.ts`
- `src/storage/legacy-v1/engine/quality-check.ts`
- `src/storage/legacy-v1/i18n/zh-HK.ts`
- `src/storage/legacy-v1/models/motion-plan.ts`
- `src/storage/legacy-v1/models/provider-capabilities.ts`
- `src/storage/schema.ts`
- `src/ui/app.ts`
- `tests/e2e/remediation.spec.ts`
- `tests/fixtures/historical-exports-v1.json`
- `tests/unit/contracts.test.ts`
- `tests/unit/future-migrations.test.ts`
- `tests/unit/remediation.test.ts`
