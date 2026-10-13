# Video Prompt Generator

A complete local-first, Traditional Chinese (Hong Kong) Image-to-Video prompt workbench for **Flow Gemini Omni**, **Flow Veo**, and **Grok Imagine**. English prompts, Chinese interpretation and side-by-side views share one deterministic Motion Plan.

No backend, paid API, LLM, login or subscription. Images and videos are processed only in the browser. The app never generates video or submits to providers.

## Run locally

Install Node.js **24 LTS** and Git. On Windows PowerShell:

```powershell
git clone https://github.com/bugu-robot/video-prompt-generator.git
cd video-prompt-generator
npm ci
npm run dev
```

Open the localhost URL printed by Vite. For install/offline acceptance, use a production build:

```powershell
npm run build
npm run preview -- --port 4173
```

Open http://localhost:4173/. Wait for the offline-ready indicator; dev mode deliberately has no Service Worker. Never open `dist/index.html` via `file://`.

## Features

- Ambient micro-motion loops, rigid object turntables, separate camera orbits, and cinematic camera movement.
- Reversible preset toggle (tap the active preset again to restore prior motion settings without reverting later provider/source edits), per-group subject/environment motion clear, bounded session-only Undo, and motion-only reset that retains source image/model. Manual motion edits clear outdated preset highlights; media removal clears Undo history to prevent resurrecting discarded assets.
- Three provider composition strategies (motion-led Omni, shot-led Veo, direct-animation Grok), useful Concise/Balanced/Detailed densities, source-aware conditional motion, 23 curated presets, relevant preservation, audio preferences and rule-based diagnostics.
- Deterministic A/B/C timing variations with no invented scene objects; fixed pure rotations disclose when constraints leave no motion freedom.
- Local image preview, metadata, subject description and pointer/keyboard rectangle marking. No automatic vision or persistent image bytes. Source-element confirmation belongs only to the current session and must be renewed after reload/history restoration.
- Custom preset save/update/rename/duplicate/delete and validated atomic JSON import/export; consistent 1 MiB UTF-8 aggregate limit, protected unreadable data, raw backup and explicitly confirmed recovery.
- Provider comparison, original-English clipboard, text export, versioned integration JSON with historical verification, explicit old/new migration review and exact original backup; documented v1 schema.
- Local video metadata, first/near-last-frame capture, RGB/luma differences, real playback preserved through prompt/provider/language editing, manual QC and JSON report. No fake identity/rotation analyzer.
- Responsive dark/light/system themes, keyboard controls, installable offline PWA, hash-versioned shell and user-controlled updates with session/worker-scoped dismiss/reopen.

## Verify

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

The Pages-mode build writes `dist-pages/` with `/video-prompt-generator/` paths. Complete Ubuntu/Windows and browser CI is a required gate for the separate existing publishing workflow, which builds and deploys `main` to the `gh-pages` branch. Live website: https://bugu-robot.github.io/video-prompt-generator/

Read [the remediation handoff](docs/REMEDIATION_HANDOFF.md), [STATUS.md](STATUS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [the user guide](docs/USER_GUIDE_ZH_HK.md), [testing](docs/TESTING.md) and [provider evidence](docs/PROVIDER_CAPABILITIES.md). Guidelines and prompt requests do not guarantee good video, silent audio, exact geometry or a seamless loop. Real-provider acceptance is manual and opt-in.
