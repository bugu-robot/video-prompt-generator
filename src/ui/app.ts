import type {
  AppSettings,
  MotionPlan,
  MotionPreset,
  PromptView,
  Region,
  Provider,
} from '../models/motion-plan';
import { PROVIDERS, PRESERVATIONS, SUBJECT_TYPES } from '../models/motion-plan';
import {
  modelsFor,
  PROVIDER_CAPABILITIES,
  VERIFIED_AT,
} from '../models/provider-capabilities';
import { compilePrompt, compareProviders } from '../engine/compile';
import {
  clearSourceSession,
  invalidateSourceConfirmation,
} from '../engine/source-confirmation';
import { generateVariations } from '../engine/variations';
import {
  defaultPlan,
  normalizePlan,
  normalizeRegion,
  switchProvider,
} from '../engine/motion-planner';
import { BUILT_IN_PRESETS, applyPreset } from '../data/motion-presets';
import { CAMERAS_DATA } from '../data/cameras';
import {
  ENVIRONMENTAL_MOTIONS,
  SUBJECT_MOTIONS,
  MOTION_BY_ID,
} from '../data/motions';
import {
  COPY as t,
  INTENSITY_LABELS,
  LOOP_DESCRIPTIONS,
  LOOP_LABELS,
  MODE_LABELS,
  PRESERVATION_LABELS,
  PROVIDER_LABELS,
  SUBJECT_LABELS,
} from '../i18n/zh-HK';
import {
  browserStorage,
  deletePreset,
  importPresets,
  inspectCustomPresets,
  listCustomPresets,
  loadSettings,
  presetBundle,
  rawPresetBackup,
  renamePreset,
  savePreset,
  saveSettings,
  restorePresets,
} from '../storage/local-storage';
import { MAX_JSON_BYTES, parseSafeJson } from '../storage/schema';
import {
  copyEnglish,
  createExport,
  downloadFile,
  importConfiguration,
  reviewConfigurationImport,
  type ConfigurationReview,
  plainText,
} from '../storage/export';
import { loadImage, aspectRatio, type LoadedImage } from '../media/image';
import {
  inspectVideo,
  QC_CHECKS,
  qcReport,
  type VideoQcResult,
  type QcCheckId,
} from '../media/video-qc';
import { registerPwa } from '../pwa/register';

const escape = (v: unknown): string =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const option = (
  value: string,
  label: string,
  selected: string,
  disabled = false,
) =>
  `<option value="${escape(value)}" ${value === selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${escape(label)}</option>`;
const select = (
  id: string,
  label: string,
  options: readonly [string, string][],
  value: string,
  key = id,
) =>
  `<label class="field" for="${id}"><span>${escape(label)}</span><select id="${id}" data-field="${key}">${options.map(([v, l]) => option(v, l, value)).join('')}</select></label>`;
const input = (
  id: string,
  label: string,
  value: string,
  key = id,
  placeholder = '',
) =>
  `<label class="field" for="${id}"><span>${escape(label)}</span><input id="${id}" data-field="${key}" value="${escape(value)}" maxlength="${id.includes('Notes') ? 500 : 160}" placeholder="${escape(placeholder)}" /></label>`;
const checkbox = (
  key: string,
  label: string,
  checked: boolean,
  disabled = false,
) =>
  `<label class="check"><input type="checkbox" data-field="${key}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}/><span>${escape(label)}</span></label>`;
const providerOptions = PROVIDERS.map(
  (p) => [p, PROVIDER_LABELS[p]] as [string, string],
);
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function mountApp(root: HTMLElement): void {
  const { storage, persistent } = browserStorage();
  const settings: AppSettings = loadSettings(storage);
  let image: LoadedImage | null = null,
    imageToken = 0,
    videoToken = 0,
    videoController: AbortController | null = null,
    videoUrl: string | null = null,
    qc: VideoQcResult | null = null;
  let activeVariant: 'base' | 'A' | 'B' | 'C' = 'base',
    presetName = '',
    presetFilter = 'all',
    recoveryBackup: string | null = null,
    toastTimer: ReturnType<typeof setTimeout> | undefined;
  let pwaStatus = '首次載入後準備離線快取',
    applyUpdate: (() => void) | null = null,
    installEvent: InstallEvent | null = null,
    drawMode = false,
    qcBusy = false;
  let previousPlan = structuredClone(settings.plan);
  let configurationReview: ConfigurationReview | null = null;
  let originalConfiguration: string | null = null;
  type PresetSnapshot = { plan: MotionPlan; name: string };
  type EditSnapshot = PresetSnapshot & { presetRestore: PresetSnapshot | null };
  const undoHistory: EditSnapshot[] = [];
  let presetRestore: PresetSnapshot | null = null;
  let previousPresetName = '';
  let previousPresetRestore: PresetSnapshot | null = null;
  let lastHistoryField = '';
  let lastHistoryTime = 0;
  const plan = () => settings.plan;
  // A selected preset is no longer an exact preset once any motion setting is edited.
  function motionSignature(p: MotionPlan): string {
    return JSON.stringify({
      mode: p.mode, subjectMotions: p.subjectMotions,
      environmentalMotions: p.environmentalMotions, primaryMotion: p.primaryMotion,
      intensity: p.intensity, motionTiming: p.motionTiming, camera: p.camera, loop: p.loop,
      rotation: p.rotation, durationSeconds: p.durationSeconds,
      preservation: p.preservation, audio: p.audio,
    });
  }
  function dropHistoryForMediaChange(): void {
    undoHistory.length = 0;
    presetRestore = null;
    previousPresetRestore = null;
    lastHistoryField = '';
  }
  function undoLastEdit(): void {
    const entry = undoHistory.pop();
    if (!entry) return;
    const restored = structuredClone(entry.plan);
    // A browser session never resurrects image bytes, removed images, or confirmations.
    if (!image || JSON.stringify(restored.source.image) !== JSON.stringify(image.metadata))
      clearSourceSession(restored);
    settings.plan = normalizePlan(restored);
    presetName = entry.name;
    presetRestore = structuredClone(entry.presetRestore);
    if (presetRestore &&
        JSON.stringify(presetRestore.plan.source.image) !== JSON.stringify(image?.metadata ?? null))
      presetRestore = null;
    previousPlan = structuredClone(plan());
    previousPresetName = presetName;
    previousPresetRestore = structuredClone(presetRestore);
    lastHistoryField = '';
    activeVariant = 'base';
    persist();
    render();
    notify('已復原上一項設定變更。');
  }
  const presets = () => {
    const state = inspectCustomPresets(storage);
    return [
      ...BUILT_IN_PRESETS,
      ...(state.status === 'ready' ? state.presets : []),
    ];
  };
  const output = () =>
    activeVariant === 'base'
      ? compilePrompt(plan())
      : generateVariations(plan()).find((v) => v.id === activeVariant)!.output;
  const notify = (message: string) => {
    const el = root.querySelector<HTMLElement>('#toast');
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (el) el.hidden = true;
    }, 5000);
  };
  function persist(): boolean {
    try {
      saveSettings(storage, settings);
      return true;
    } catch {
      notify(
        '無法儲存設定（瀏覽器儲存空間或政策限制）；目前操作仍可使用，請匯出備份。',
      );
      return false;
    }
  }
  function applyTheme(): void {
    document.documentElement.dataset.theme =
      settings.theme === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : settings.theme;
  }
  const resolveError = (error: unknown) =>
    error instanceof Error ? error.message : '操作未能完成，請重試。';
  const errors = (out = output()) =>
    out.findings.some((f) => f.severity === 'error');
  function imageMarkup(): string {
    const r = plan().source.region;
    return `<section class="panel" aria-labelledby="source-title"><div class="section-heading"><span class="step">01</span><h2 id="source-title">${t.source}</h2><span class="pill">${t.local}</span></div>
      <div class="drop-zone" id="drop-zone">${image ? `<div class="image-stage ${drawMode ? 'is-drawing' : ''}" id="image-stage"><img id="source-preview" src="${escape(image.url)}" alt="使用者提供的原圖" draggable="false"/><div class="region" id="region-overlay" ${r ? '' : 'hidden'} style="${r ? `left:${r.x * 100}%;top:${r.y * 100}%;width:${r.width * 100}%;height:${r.height * 100}%;` : ''}"></div></div>` : `<div class="image-empty"><span class="empty-icon" aria-hidden="true">＋</span><strong>由一張原圖開始</strong><p>${t.noImage}</p></div>`}
      <label for="image-file" class="upload-label">${image ? '更換原圖' : t.drop}</label><input id="image-file" type="file" accept="image/png,image/jpeg,image/webp" class="file-input" aria-label="選擇原圖"/></div>
      ${image ? `<p class="metadata">${escape(image.metadata.name)} · ${image.metadata.width} × ${image.metadata.height} · ${aspectRatio(image.metadata.width, image.metadata.height)}</p><div class="actions"><button data-action="draw" aria-pressed="${drawMode}" class="small">${drawMode ? '結束框選' : '框選主體位置'}</button><button data-action="clear-region" class="small">清除框選</button><button data-action="remove-image" class="small">移除原圖</button></div>` : ''}
      <p class="hint">PNG／JPEG／WebP · 最多 25 MB。圖片只留在本次會話，不儲存圖片內容；輸出僅包含 metadata。</p>
      ${select(
        'subjectType',
        '要移動的主體',
        SUBJECT_TYPES.map((v) => [v, SUBJECT_LABELS[v].zh]),
        plan().source.subjectType,
        'source.subjectType',
      )}
      ${plan().source.subjectType === 'custom' || plan().source.subjectEn ? input('subjectEn', '英文主體描述', plan().source.subjectEn, 'source.subjectEn', '例如 the hedgehog wearing cream headphones') + input('subjectZh', '中文主體描述（自行填寫）', plan().source.subjectZh, 'source.subjectZh', '例如 戴米白色耳機的刺蝟') : ''}
      <details data-section="context"><summary>主體位置與場景補充</summary><p class="hint">沒有自動翻譯。只會把英文補充加入供應商提示；中文欄位用作解讀。</p>
      ${input('sceneNotesEn', '英文場景補充', plan().source.sceneNotesEn, 'source.sceneNotesEn', '只補充需要的動作限制或現有元素')}${input('sceneNotesZh', '繁中場景補充', plan().source.sceneNotesZh, 'source.sceneNotesZh')}
      ${image ? `<p class="hint">也可用鍵盤設定框選位置；百分比只是本機位置標記，不能控制外部供應商遮罩。</p><div class="region-fields">${(['x', 'y', 'width', 'height'] as const).map((k, i) => `<label class="field" for="region-${k}"><span>${['左側 %', '上方 %', '闊度 %', '高度 %'][i]}</span><input type="number" min="${k === 'width' || k === 'height' ? 1 : 0}" max="${k === 'width' || k === 'height' ? 100 : 99}" id="region-${k}" data-region="${k}" value="${Math.round((r ?? { x: 0, y: 0, width: 1, height: 1 })[k] * 100)}"/></label>`).join('')}</div>` : ''}</details>
    </section>`;
  }
  function providerMarkup(): string {
    const p = plan(),
      cap = PROVIDER_CAPABILITIES[p.model];
    return `<section class="panel"><div class="section-heading"><span class="step">02</span><h2>${t.provider}</h2></div>${select('provider', '目標供應商', providerOptions, p.provider)}
      ${select(
        'model',
        '外部網站模型',
        modelsFor(p.provider).map((c) => [c.model, c.displayName]),
        p.model,
      )}
      <div class="mode-switch" role="group" aria-label="生成模式">${Object.entries(
        MODE_LABELS,
      )
        .map(
          ([id, label]) =>
            `<button data-action="mode" data-mode="${id}" aria-pressed="${p.mode === id}" class="mode-button ${p.mode === id ? 'selected' : ''}">${label}</button>`,
        )
        .join('')}</div>
      <div class="form-grid">${select('intensity', '動作幅度', Object.entries(INTENSITY_LABELS), p.intensity)}
      <label class="field" for="duration"><span>${p.mode === 'rotation' ? '旋轉時長偏好' : '時長偏好'}</span><select id="duration" data-field="durationSeconds">${option('auto', '使用網站預設', p.durationSeconds === null ? 'auto' : String(p.durationSeconds))}${[4, 6, 8, 10, 12, 15, 20, 30].map((n) => option(String(n), `${n} 秒${cap.consumerDurations && !cap.consumerDurations.includes(n) ? ' · 此模型未支援' : !cap.consumerDurations ? ' · 待確認' : ''}`, String(p.durationSeconds), Boolean(cap.consumerDurations && !cap.consumerDurations.includes(n)))).join('')}${p.durationSeconds !== null && ![4, 6, 8, 10, 12, 15, 20, 30].includes(p.durationSeconds) ? option(String(p.durationSeconds), p.durationSeconds + ' 秒 · 匯入偏好', String(p.durationSeconds)) : ''}</select></label></div>
      ${p.mode === 'rotation' ? '<p class="hint">旋轉模式使用角度、速度與時長控制；動作幅度只適用於另外兩個模式。</p>' : ''}
      <p class="hint">功能核實：${VERIFIED_AT}。外部網站的帳戶、地區及介面可有差異；沒有自動設定或提交。</p></section>`;
  }
  function motionMarkup(): string {
    const p = plan();
    const chips = (
      items: typeof SUBJECT_MOTIONS,
      key: 'subjectMotions' | 'environmentalMotions',
    ) =>
      `<div class="chips" role="group" aria-label="${key === 'subjectMotions' ? '主體動作' : '環境動作'}">${items.map((m) => `<label class="chip ${p[key].includes(m.id) ? 'selected' : ''}"><input type="checkbox" data-motion="${key}" value="${m.id}" ${p[key].includes(m.id) ? 'checked' : ''}/><span>${m.nameZh}</span></label>`).join('')}</div>`;
    const ids = [...p.subjectMotions, ...p.environmentalMotions];
    return `<section class="panel"><div class="section-heading"><span class="step">03</span><h2>${p.mode === 'rotation' ? '旋轉控制' : t.motion}</h2></div>${
      p.mode === 'rotation'
        ? rotationMarkup()
        : `
      <div class="section-heading"><h3>主體微動作</h3><button class="small" data-action="clear-subject-motions" ${p.subjectMotions.length ? '' : 'disabled'}>清空主體動作</button></div>${chips(SUBJECT_MOTIONS.slice(0, 6), 'subjectMotions')}<details data-section="more-subject"><summary>更多主體動作</summary>${chips(SUBJECT_MOTIONS.slice(6), 'subjectMotions')}</details>
      <div class="section-heading"><h3>環境動作</h3><button class="small" data-action="clear-environment-motions" ${p.environmentalMotions.length ? '' : 'disabled'}>清空環境動作</button></div>${chips(ENVIRONMENTAL_MOTIONS.slice(0, 6), 'environmentalMotions')}<details data-section="more-environment"><summary>水面、微風與其他環境動作</summary>${chips(ENVIRONMENTAL_MOTIONS.slice(6), 'environmentalMotions')}</details>
      ${select(
        'primaryMotion',
        '優先動作',
        ids.map((id) => [id, MOTION_BY_ID.get(id)?.nameZh ?? id]),
        p.primaryMotion ?? '',
      )}
      ${checkbox('source.elementsConfirmed', '我已確認所有已選動作元素都在原圖存在', p.source.elementsConfirmed)}
      <p class="hint">未勾選時使用「如原圖已有」描述。選一個主要動作，加一至兩個次要動作，通常較易保持穩定。</p>
      ${select(
        'camera',
        '鏡頭行為',
        CAMERAS_DATA.filter((c) => c.modes.includes(p.mode)).map((c) => [
          c.id,
          c.nameZh,
        ]),
        p.camera,
      )}`
    }</section>`;
  }
  function rotationMarkup(): string {
    const r = plan().rotation;
    return `${select(
      'rotationType',
      '旋轉方式',
      [
        ['turntable', '物件自轉 · 鏡頭固定'],
        ['orbit', '鏡頭繞行 · 物件固定'],
      ],
      r.type,
      'rotation.type',
    )}<div class="form-grid">
      ${select(
        'angle',
        '轉動角度',
        [
          ['90', '90° · 四分之一圈'],
          ['180', '180° · 半圈'],
          ['360', '360° · 完整一圈'],
        ],
        String(r.angle),
        'rotation.angle',
      )}
      ${select(
        'direction',
        '方向',
        [
          ['clockwise', '順時針'],
          ['counterclockwise', '逆時針'],
        ],
        r.direction,
        'rotation.direction',
      )}
      ${select(
        'speed',
        '速度方式',
        [
          ['uniform', '等速 · 適合循環'],
          ['slow', '慢速而穩定'],
          ['ease', '緩入／緩出'],
        ],
        r.speed,
        'rotation.speed',
      )}
      ${select(
        'axis',
        '旋轉軸',
        [
          ['y', 'Y 軸 · 垂直'],
          ['x', 'X 軸 · 水平'],
          ['z', 'Z 軸 · 深度／視線'],
        ],
        r.axis,
        'rotation.axis',
      )}</div>
      ${select(
        'rotationInput',
        '輸入來源／外部工作流程',
        [
          ['single', '單張圖片 · 近似重建'],
          ['references', '多角度參考圖 · 外部手動提供'],
          ['3d', '真正 3D 來源 · 外部 renderer'],
        ],
        r.inputMode,
        'rotation.inputMode',
      )}
      <p class="hint">順／逆時針以從正軸方向望向物件中心為準；Y 軸即由上方望下。方向是生成意圖，仍須驗收。</p><p class="callout">單張圖並無已驗證背面。生成器不能確認幾何或是否轉足一圈；多參考圖也不會由此程式傳送至外部網站。</p>
      <details data-section="rotation-advanced"><summary>構圖、幾何與旋轉穩定性</summary><div class="check-grid">${[
        ['centered', '主體置中'],
        ['stableFraming', '穩定構圖'],
        ['consistentScale', '保持物件大小'],
        ['stableLighting', '固定場景光源'],
        ['geometry', '保留可見幾何與比例'],
        ['details', '保留辨識細節'],
      ]
        .map(([k, l]) =>
          checkbox('rotation.' + k, l!, r[k as keyof typeof r] === true),
        )
        .join('')}
      ${checkbox('rotation.returnToStart', '360° 後回到起始方向／鏡頭位置', r.returnToStart, r.angle !== 360)}</div></details>`;
  }
  function advancedMarkup(): string {
    const p = plan();
    return `<section class="panel"><div class="section-heading"><span class="step">04</span><h2>循環與保留</h2></div>${select('loop', '循環策略', Object.entries(LOOP_LABELS), p.loop)}<p class="hint">${p.mode === 'rotation' && p.rotation.angle !== 360 ? '單向 90°／180° 的尾端方向／視角與開首不同；如指定外部尾幀，應使用目標方向的不同圖片。重複播放須另行剪輯或設計回程，亦可選擇不要求循環。' : LOOP_DESCRIPTIONS[p.loop]}「Loop-friendly」不代表保證無縫。</p>
      <details data-section="preservation"><summary>原圖保留項目與音訊</summary><div class="check-grid">${PRESERVATIONS.map((k) => `<label class="check"><input type="checkbox" data-preserve="${k}" ${p.preservation.includes(k) ? 'checked' : ''}/><span>${PRESERVATION_LABELS[k].zh}</span></label>`).join('')}</div>
      ${select(
        'audio',
        '音訊偏好',
        [
          ['none-requested', '不要求音訊 · 預設'],
          ['ambient', '自然環境聲'],
          ['provider-default', '不寫音訊指示 · 供應商預設'],
        ],
        p.audio,
      )}<p class="hint">未要求音訊不能保證靜音。Jazz 頻道可在最終渲染移除生成音軌。</p></details>
      ${select(
        'length',
        '提示詞長度',
        [
          ['concise', '精簡 · 所有約束濃縮一段'],
          ['balanced', '平衡 · 清楚分段'],
          ['detailed', '詳細 · 加入時間連續性指示'],
        ],
        p.length,
      )}</section>`;
  }
  function presetMarkup(): string {
    const state = inspectCustomPresets(storage),
      available = [
        ...BUILT_IN_PRESETS,
        ...(state.status === 'ready' ? state.presets : []),
      ],
      items = available.filter(
        (p) => presetFilter === 'all' || p.category === presetFilter,
      ),
      current = available.find((p) => p.id === plan().presetId),
      isCustom = current?.category === 'custom',
      blocked = state.status === 'unreadable';
    return `<section class="panel"><div class="section-heading"><span class="step">05</span><h2>動作預設</h2><span class="pill">${BUILT_IN_PRESETS.length} 個內置</span></div>
      ${select(
        'presetFilter',
        '分類',
        [
          ['all', '全部'],
          ['cafe', '咖啡廳'],
          ['character', '角色／Mochi'],
          ['nature', '自然'],
          ['rotation', '旋轉'],
          ['cinematic', '電影感'],
          ['custom', '我的預設'],
        ],
        presetFilter,
        'ui.presetFilter',
      )}
      ${blocked ? `<div class="callout" role="alert" id="preset-recovery"><p>${escape(state.messageZh)}</p><button data-action="export-raw-presets" ${state.raw === null ? 'disabled' : ''}>匯出原始預設備份</button><details data-section="preset-recovery"><summary>復原不可讀的自訂預設</summary><p>先下載原始備份並確認檔案已保存。修復 JSON 格式，或將過大的資料分拆為符合 schema、最多 100 個預設及 1 MiB 的檔案。復原只替換自訂預設；未放入復原檔案的項目仍保留在你下載的原始備份內。其他設定及媒體不受影響。</p><label class="check"><input id="preset-recovery-confirm" type="checkbox" ${recoveryBackup !== null && recoveryBackup === state.raw ? '' : 'disabled'}/><span>我已保存原始備份，確認以已修復的 JSON 替換目前不可讀的自訂預設</span></label><button data-action="restore-presets" disabled>選取已修復 JSON 並復原</button><input id="recovery-file" class="file-input" type="file" accept="application/json,.json" aria-label="復原預設 JSON"/></details></div>` : ''}
      <div class="preset-list">${items.map((p) => `<button class="preset-card ${p.id === plan().presetId && motionSignature(p.plan) === motionSignature(plan()) ? 'selected' : ''}" data-action="preset" data-id="${escape(p.id)}" aria-pressed="${p.id === plan().presetId && motionSignature(p.plan) === motionSignature(plan())}"><strong>${escape(p.nameZh)}</strong><span>${escape(p.nameEn)}</span><small>${escape(p.descriptionZh)}</small></button>`).join('') || `<p class="hint">${blocked ? '自訂預設暫時無法顯示；原始資料仍在，請使用上方復原功能。' : '此分類還沒有自訂預設。'}</p>`}</div>
      <p class="hint">再次點擊剛套用的預設，可恢復套用前設定；手動修改動作後，預設會取消選取。亦可使用「復原上一步」。</p>
      ${current ? `<p class="hint">${current.category === 'custom' && motionSignature(current.plan) !== motionSignature(plan()) ? '修改中（可更新自訂）：' : '已選：'}${escape(current.nameZh)}。${current.warningsZh.map(escape).join(' ')}${current.providerNotesZh.map(escape).join(' ')}</p>` : ''}
      <label class="field" for="presetName"><span>自訂預設名稱</span><input id="presetName" maxlength="80" value="${escape(presetName)}" placeholder="例如 Mochi 雨天微動作"/></label>
      <div class="actions"><button data-action="save-preset" ${blocked ? 'disabled' : ''}>另存設定</button><button data-action="duplicate-preset" ${blocked ? 'disabled' : ''}>複製設定</button><button data-action="update-preset" ${isCustom ? '' : 'disabled'}>更新自訂</button><button data-action="rename-preset" ${isCustom ? '' : 'disabled'}>重新命名</button><button data-action="delete-preset" ${isCustom ? '' : 'disabled'}>刪除自訂</button></div>
      <div class="actions"><button data-action="export-presets" ${state.status === 'ready' && state.presets.length ? '' : 'disabled'}>匯出全部自訂</button><button data-action="export-selected" ${current ? '' : 'disabled'}>匯出已選預設</button><button data-action="import-json">匯入預設／設定 JSON</button></div><input id="json-file" class="file-input" type="file" accept="application/json,.json" aria-label="匯入 JSON"/>
      <p class="hint">預設儲存左邊的原設定；A/B/C 版本可用輸出 JSON 保留。內置預設可複製後編輯。儲存的是動作設定，不包含圖片、影片或框選。匯入會先完整驗證，不覆蓋已有預設。自訂預設總量及單次 JSON 均限 1 MiB（1,048,576 UTF-8 bytes），最多 100 個。</p></section>`;
  }
  function promptMarkup(
    english: string,
    chinese: string,
    view: PromptView,
    small = false,
  ): string {
    return `<div class="prompt-grid ${view === 'both' ? 'bilingual' : ''} ${small ? 'mini' : ''}">${view !== 'zh' ? `<div class="prompt-block"><h3>English Original</h3><pre lang="en">${escape(english)}</pre></div>` : ''}${view !== 'en' ? `<div class="prompt-block interpretation"><h3>繁體中文解讀</h3><pre lang="zh-HK">${escape(chinese)}</pre></div>` : ''}</div>`;
  }
  function outputMarkup(): string {
    const out = output(),
      p = out.plan,
      blocked = errors(out),
      variants = generateVariations(plan()),
      counts = { error: 0, warning: 0, recommendation: 0 };
    out.findings.forEach((f) => counts[f.severity]++);
    return `<div class="output-heading"><div><span class="eyebrow">MOTION → PROMPT</span><h2>${t.output}</h2></div><span class="pill accent">${activeVariant === 'base' ? '原設定' : activeVariant + ' 版本'}</span></div>
      <section class="panel output-panel"><div class="output-toolbar"><div class="view-tabs" role="group" aria-label="提示顯示語言">${[
        ['en', '英文原文'],
        ['zh', '繁中解讀'],
        ['both', '中英對照'],
      ]
        .map(
          ([id, l]) =>
            `<button data-action="view" data-view="${id}" aria-pressed="${settings.view === id}" class="${settings.view === id ? 'selected' : ''}">${l}</button>`,
        )
        .join(
          '',
        )}</div><button class="primary" data-action="copy" ${blocked ? 'disabled' : ''}>${t.copy}</button></div>
      <p class="hint">${t.viewNote} 複製按鈕一直使用英文原文。</p>
      <div class="config-summary"><span>${PROVIDER_LABELS[p.provider]}</span><span>${MODE_LABELS[p.mode]}</span><span>${p.mode === 'rotation' ? p.rotation.angle + '° · ' + (p.rotation.type === 'turntable' ? '物件自轉' : '鏡頭繞行') : INTENSITY_LABELS[p.intensity]}</span><span>${p.durationSeconds === null ? '網站預設時長' : p.durationSeconds + ' 秒偏好'}</span><span>${LOOP_LABELS[p.loop]}</span></div>
      <div id="final-prompt">${promptMarkup(out.english, out.chinese, settings.view)}</div>
      <div class="actions export-actions"><button data-action="export-json">${t.exportJson}</button><button data-action="export-text">${t.exportText}</button><button data-action="base" ${activeVariant === 'base' ? 'disabled' : ''}>回到原設定</button><button data-action="undo" ${undoHistory.length ? '' : 'disabled'}>復原上一步</button><button data-action="reset-motions">只重設動作（保留圖片）</button><button data-action="reset">清除／重設</button></div>
      ${blocked ? '<p class="error-note" role="alert">請先修正錯誤才可複製提示詞；JSON 仍可匯出作檢查。</p>' : ''}</section>
      <section class="panel audit-panel"><div class="section-heading"><h2>品質與相容性檢查</h2><span class="pill">${counts.error} 錯誤 · ${counts.warning} 提醒</span></div>
        <ul class="findings">${out.findings.map((f) => `<li class="finding ${f.severity}" data-finding="${f.id}"><span class="finding-tag">${{ error: '錯誤', warning: '提醒', recommendation: '建議' }[f.severity]}</span><span>${escape(f.messageZh)}</span></li>`).join('') || '<li>目前規則沒有發現衝突。</li>'}</ul>
        <details data-section="workflow"><summary>在外部供應商網站如何使用</summary><ol class="workflow">${out.workflowZh.map((s) => `<li>${escape(s)}</li>`).join('')}</ol></details>
        <p class="hint">規則檢查沒有兼容率或成功率評分；未解析圖片，亦不能完整理解自由文字。</p></section>
      <section class="variations" aria-labelledby="variation-title"><div class="section-heading"><h2 id="variation-title">Smart A／B／C</h2><span class="hint">同一意圖 · 可重現</span></div><div class="variation-grid">${variants.map((v) => `<article class="panel variation-card ${activeVariant === v.id ? 'active' : ''}"><span class="variation-letter">${v.id}</span><h3>${v.nameZh}</h3><p>${v.descriptionZh}</p><ul>${v.changesZh.map((x) => `<li>${escape(x)}</li>`).join('')}</ul><details data-section="variation-${v.id}"><summary>查看提示預覽</summary>${promptMarkup(v.output.english, v.output.chinese, settings.view, true)}</details><div class="actions"><button data-action="variant" data-variant="${v.id}">查看 ${v.id}</button><button data-action="copy-variant" data-variant="${v.id}" ${errors(v.output) ? 'disabled' : ''}>複製英文 ${v.id}</button></div></article>`).join('')}</div></section>
      <details class="panel comparison" data-section="comparison"><summary>用相同 Motion Plan 比較 Omni／Veo／Grok</summary><p class="hint">保留主體、動作、鏡頭與保留規則；每個 provider 使用其預設或當前已選模型，各自檢查相容性。</p><div class="comparison-grid">${Object.entries(
        compareProviders(p),
      )
        .map(
          ([provider, c]) =>
            `<article><h3>${PROVIDER_LABELS[provider as Provider]}</h3><p class="hint">${provider === 'omni' ? '先表達主要動作，以自然敘述連接同時發生的動作，再列鏡頭與保留約束。' : provider === 'veo' ? '先定鏡頭，再分主要／次要動作、時長與接點，最後列原圖保留約束。' : '直接列動畫動作及節奏，再指定鏡頭與接點；網站規格未核實。'}</p>${promptMarkup(c.english, c.chinese, settings.view, true)}${c.findings
              .filter((f) => f.severity !== 'recommendation')
              .map((f) => `<p class="hint">${escape(f.messageZh)}</p>`)
              .join(
                '',
              )}<button data-action="copy-provider" data-provider="${provider}" ${errors(c) ? 'disabled' : ''}>複製英文 · ${provider}</button></article>`,
        )
        .join('')}</div></details>
      ${configurationReviewMarkup()}`;
  }
  function configurationReviewMarkup(): string {
    const review = configurationReview;
    if (!review)
      return originalConfiguration
        ? `<section class="panel"><p>原匯出只保留在此會話，可另行備份；原檔不會更改。</p><button data-action="export-original-configuration">匯出原始設定檔</button></section>`
        : '';
    return `<section class="panel" id="configuration-import-review"><h2>確認舊版本設定遷移</h2><p>${review.changesZh.map(escape).join(' ')}</p><h3>原英文提示 · compiler ${escape(review.original.compilerVersion)}</h3><pre lang="en">${escape(review.original.generatedEnglishPrompt)}</pre><h3>新英文提示 · compiler ${escape(review.recompiled.compilerVersion)}</h3><pre lang="en">${escape(review.recompiled.generatedEnglishPrompt)}</pre><ul>${review.recompiled.qcWarnings.map((f) => `<li>${escape(f.messageZh)}</li>`).join('')}</ul><p>確認後只採用原動作設定並用新規則重編譯；須重新選原圖和確認元素。原檔不會覆寫，原 prompt 不會當成新版 prompt。</p><div class="actions"><button data-action="export-original-configuration">匯出原始設定檔</button><button data-action="accept-configuration-migration">確認保留意圖並採用新編譯</button><button data-action="cancel-configuration-migration">取消遷移</button></div></section>`;
  }
  function adoptConfiguration(raw: string, acceptMigration = false): void {
    const imported = importConfiguration(raw, { acceptMigration });
    image?.dispose();
    image = null;
    imageToken++;
    settings.plan = imported;
    dropHistoryForMediaChange();
    settings.plan.source.image = null;
    settings.plan.source.region = null;
    settings.plan.source.elementsConfirmed = false;
    changed();
    dropHistoryForMediaChange();
    render();
    notify('設定已匯入並重新編譯；請重新選取原圖及確認元素。');
  }
  function qcMarkup(): string {
    return `<section class="panel video-panel"><div class="section-heading"><h2>本機影片 QC</h2><span class="pill">不會上傳</span></div><p class="hint">上載已生成影片，在本機擷取首幀及接近片尾的樣本。像素差異是量度訊號，不能證明無縫或 360° 完成。</p><label class="upload-label" for="video-file">${qcBusy ? '正在本機讀取，可選另一影片取消前一次' : '選擇影片作檢查'}</label><input id="video-file" class="file-input" type="file" accept="video/mp4,video/webm,video/quicktime" aria-label="選擇 QC 影片"/><p class="hint">MP4／WebM／MOV · 最多 300 MB／10 分鐘；codec 支援取決於瀏覽器。</p>
      ${
        qc
          ? `<p class="metadata">${escape(qc.name)} · ${qc.durationSeconds.toFixed(3)} 秒 · ${qc.width} × ${qc.height}</p><video src="${escape(videoUrl)}" controls muted playsinline preload="metadata" aria-label="本機 QC 影片播放"></video>
      <div class="frame-grid"><figure><img src="${qc.firstFrame}" alt="首幀樣本"/><figcaption>首幀 · ${qc.firstFrameTime.toFixed(3)} 秒</figcaption></figure><figure><img src="${qc.lastFrame}" alt="接近片尾的樣本"/><figcaption>近尾幀 · ${qc.lastFrameTime.toFixed(3)} 秒（非已驗證最後一幀）</figcaption></figure></div>
      <p class="metric">RGB 平均絕對差異：<strong>${(qc.metric.meanAbsoluteRgbDifference * 100).toFixed(2)}%</strong> · 亮度差異 ${(qc.metric.meanAbsoluteLumaDifference * 100).toFixed(2)}% · ${qc.metric.sampleWidth} × ${qc.metric.sampleHeight} 樣本</p>
      ${qc.metric.warningZh ? `<p class="callout">${qc.metric.warningZh}</p>` : ''}<p class="hint">低差異也可能來自全段靜止，不能確認循環、身份一致或旋轉角度。</p>
      <h3>人手驗收 · 未選項目保持待檢</h3><div class="qc-checklist">${QC_CHECKS.map(
        ([id, l]) =>
          select(
            'qc-' + id,
            l,
            [
              ['pending', '待檢查'],
              ['pass', '通過'],
              ['fail', '不通過'],
              ['na', '不適用'],
            ],
            qc!.checks[id] ?? 'pending',
            'qc.' + id,
          ),
      ).join('')}</div>
      <label class="field" for="qc-notes"><span>QC 備註</span><textarea id="qc-notes" maxlength="2000">${escape(qc.notes)}</textarea></label><div class="actions"><button data-action="export-qc">匯出 QC JSON 報告</button><button data-action="clear-qc">清除影片與 QC</button></div>`
          : ''
      }</section>`;
  }
  function render(): void {
    const open = [
      ...root.querySelectorAll<HTMLDetailsElement>(
        'details[open][data-section]',
      ),
    ].map((d) => d.dataset.section);
    const focus = document.activeElement?.id;
    const template = document.createElement('template');
    template.innerHTML = `<header class="app-header"><div class="brand"><span class="brand-icon" aria-hidden="true">▶</span><div><h1>${t.appName}</h1><p>${t.subtitle}</p></div></div><div class="header-actions"><span class="status-dot" aria-hidden="true"></span><span id="pwa-status" class="hint">${pwaStatus}</span>${select(
      'theme',
      '主題',
      [
        ['dark', '深色'],
        ['light', '淺色'],
        ['system', '跟隨系統'],
      ],
      settings.theme,
      'ui.theme',
    )}<button data-action="install">${installEvent ? '安裝 App' : '安裝說明'}</button></div></header>
      <div id="update-banner" class="update-banner" ${applyUpdate ? '' : 'hidden'}><span>有新版本可用。設定會先儲存；重新載入後需重新選取圖片／影片。</span><button data-action="update">儲存設定並更新</button></div>
      <details class="quick-guide" data-section="guide"><summary>使用說明與資料私隱</summary><p>選圖 → 指定主體 → 選模型及動作 → 檢查提示及提醒 → 複製英文，在外部網站自行生成。預設設定適合低幅度 Cozy Jazz 背景。</p><p>${t.privacy} 沒有 vision model、LLM、登入、生成服務或外部 API。原圖及影片只留在當次會話；設定與自訂 presets 存於此瀏覽器。</p><p>Chrome／Edge 可使用瀏覽器安裝功能；Safari 可加入 Dock 或主畫面。首次在線開啟 production build，待「離線已就緒」後可離線使用。localhost 與 HTTPS 才支援 Service Worker。</p>${!persistent ? '<p class="error-note">瀏覽器不允許永久儲存；目前改用記憶體，離開後會遺失，請匯出備份。</p>' : ''}<a href="https://github.com/bugu-robot/video-prompt-generator/blob/feat/local-first-video-prompt-generator/docs/USER_GUIDE_ZH_HK.md" target="_blank" rel="noopener noreferrer">完整繁中使用指南</a></details>
      <main class="workspace"><div class="configuration" aria-label="提示詞設定">${imageMarkup()}${providerMarkup()}${motionMarkup()}${advancedMarkup()}${presetMarkup()}</div><div class="output" id="output" tabindex="-1" aria-label="提示詞輸出"><div id="prompt-output">${outputMarkup()}</div><div id="qc-output">${qcMarkup()}</div></div></main>
      <footer>Video Prompt Generator · deterministic local engine · guidelines verified ${VERIFIED_AT}<p>提示符合指南不保證影片品質。所有外部生成及額度使用均由你自行操作。</p></footer><div id="toast" class="toast" role="status" aria-live="polite" hidden></div><div class="mobile-copy"><a href="#output">查看提示詞</a><button data-action="copy" ${errors() ? 'disabled' : ''}>複製英文</button></div>`;
    if (!root.querySelector('.workspace'))
      root.replaceChildren(template.content);
    else {
      // The media subtree is never detached/reparented by ordinary rendering.
      // Reusing it in place preserves playback, buffered data and text focus.
      for (const selector of [
        '.app-header',
        '#update-banner',
        '.quick-guide',
        '.configuration',
        'footer',
        '.mobile-copy',
      ]) {
        root
          .querySelector(selector)!
          .replaceWith(template.content.querySelector(selector)!);
      }
      root.querySelector('#prompt-output')!.innerHTML = outputMarkup();
    }
    for (const id of open)
      root
        .querySelector<HTMLDetailsElement>(`details[data-section="${id}"]`)
        ?.setAttribute('open', '');
    if (focus)
      root
        .querySelector<HTMLElement>('#' + CSS.escape(focus))
        ?.focus({ preventScroll: true });
    if (plan().mode === 'rotation')
      root.querySelector<HTMLSelectElement>('#intensity')!.disabled = true;
    applyTheme();
  }
  function renderOutput(): void {
    const el = root.querySelector<HTMLElement>('#prompt-output')!,
      open = [
        ...el.querySelectorAll<HTMLDetailsElement>(
          'details[open][data-section]',
        ),
      ].map((d) => d.dataset.section);
    el.innerHTML = outputMarkup();
    for (const id of open)
      el.querySelector<HTMLDetailsElement>(
        `details[data-section="${id}"]`,
      )?.setAttribute('open', '');
    root.querySelector<HTMLButtonElement>('.mobile-copy button')!.disabled =
      errors();
  }
  function renderQc(): void {
    root.querySelector('#qc-output')!.innerHTML = qcMarkup();
  }
  async function setImage(file: File): Promise<void> {
    const token = ++imageToken;
    try {
      const loaded = await loadImage(file);
      if (token !== imageToken) {
        loaded.dispose();
        return;
      }
      image?.dispose();
      image = loaded;
      plan().source.image = loaded.metadata;
      plan().source.region = null;
      plan().source.elementsConfirmed = false;
      drawMode = false;
      dropHistoryForMediaChange();
      changed();
      dropHistoryForMediaChange();
      render();
      notify('圖片已在本機載入；沒有傳送至外部網站。');
    } catch (error) {
      if (token === imageToken) notify(resolveError(error));
    }
  }
  function clearQc(): void {
    ++videoToken;
    videoController?.abort();
    videoController = null;
    const player = root.querySelector<HTMLVideoElement>('.video-panel video');
    if (player) {
      player.pause();
      player.removeAttribute('src');
      player.load();
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = null;
    qc = null;
    qcBusy = false;
  }
  async function setVideo(file: File): Promise<void> {
    clearQc();
    const token = ++videoToken;
    videoController = new AbortController();
    qcBusy = true;
    renderQc();
    try {
      const result = await inspectVideo(file, videoController.signal);
      if (token !== videoToken) return;
      qc = result;
      videoUrl = URL.createObjectURL(file);
      qcBusy = false;
      renderQc();
      notify('首尾樣本及 metadata 已擷取，請完成人手驗收。');
    } catch (error) {
      if (token === videoToken) {
        qcBusy = false;
        renderQc();
        notify(resolveError(error));
      }
    }
  }
  function changed(field = ''): void {
    const next = invalidateSourceConfirmation(previousPlan, normalizePlan(plan()));
    if (next.presetId && next.presetId === previousPlan.presetId &&
        motionSignature(previousPlan) !== motionSignature(next)) {
      // Built-ins are no longer selected once edited. Custom presets keep
      // their identity so Update/Rename/Delete remain available for editing.
      if (presets().find((p) => p.id === next.presetId)?.category !== 'custom')
        next.presetId = null;
      presetRestore = null;
    }
    const modified = JSON.stringify(previousPlan) !== JSON.stringify(next);
    if (modified) {
      const now = Date.now();
      // Group consecutive keystrokes in one text field into one Undo step.
      const continuousTyping = Boolean(field) && field === lastHistoryField &&
        now - lastHistoryTime < 1200;
      if (!continuousTyping) {
        undoHistory.push({
          plan: structuredClone(previousPlan),
          name: previousPresetName,
          presetRestore: structuredClone(previousPresetRestore),
        });
        if (undoHistory.length > 30) undoHistory.shift();
      }
      lastHistoryField = field;
      lastHistoryTime = now;
    }
    settings.plan = next;
    previousPlan = structuredClone(next);
    previousPresetName = presetName;
    previousPresetRestore = structuredClone(presetRestore);
    syncSourceConfirmation();
    activeVariant = 'base';
    persist();
  }
  function syncSourceConfirmation(): void {
    const confirmation = root.querySelector<HTMLInputElement>(
      '[data-field="source.elementsConfirmed"]',
    );
    if (confirmation)
      confirmation.checked = settings.plan.source.elementsConfirmed;
  }
  function isTextField(key: string): boolean { return ['source.subjectEn','source.subjectZh','source.sceneNotesEn','source.sceneNotesZh'].includes(key); }
  function setField(key: string, value: string | boolean): void {
    const p = plan();
    if (key === 'ui.presetFilter') {
      presetFilter = String(value);
      render();
      return;
    }
    if (key === 'ui.theme') {
      settings.theme = value as AppSettings['theme'];
      persist();
      applyTheme();
      return;
    }
    if (key.startsWith('qc.')) {
      if (qc) {
        const id = key.slice(3) as QcCheckId;
        if (value === 'pending') delete qc.checks[id];
        else qc.checks[id] = value as 'pass' | 'fail' | 'na';
      }
      return;
    }
    if (key === 'provider') {
      settings.plan = switchProvider(p, value as Provider);
    } else if (key === 'model') {
      p.model = value as MotionPlan['model'];
    } else if (key === 'durationSeconds') {
      p.durationSeconds = value === 'auto' ? null : Number(value);
    } else if (key.startsWith('source.')) {
      const source = p.source as unknown as Record<string, unknown>;
      source[key.slice(7)] = value;
    } else if (key.startsWith('rotation.')) {
      const k = key.slice(9),
        rotation = p.rotation as unknown as Record<string, unknown>;
      rotation[k] = k === 'angle' ? Number(value) : value;
      if (k === 'type') p.camera = value === 'orbit' ? 'orbit' : 'locked';
      if (k === 'angle') p.rotation.returnToStart = Number(value) === 360;
    } else {
      (p as unknown as Record<string, unknown>)[key] = value;
    }
    const previousVariant = activeVariant;
    changed(isTextField(key) ? key : '');
    if (key === 'provider' || key === 'model') activeVariant = previousVariant;
    const isText = [
      'source.subjectEn',
      'source.subjectZh',
      'source.sceneNotesEn',
      'source.sceneNotesZh',
    ].includes(key);
    if (isText) renderOutput();
    else render();
  }
  root.addEventListener('input', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement))
      return;
    if (el.id === 'presetName') {
      presetName = el.value;
      previousPresetName = presetName;
      return;
    }
    if (el.id === 'qc-notes') {
      if (qc) qc.notes = el.value;
      return;
    }
    if (
      el instanceof HTMLInputElement &&
      el.type === 'text' &&
      el.dataset.field
    )
      setField(el.dataset.field, el.value);
  });
  root.addEventListener('change', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement))
      return;
    if (el.id === 'preset-recovery-confirm' && el instanceof HTMLInputElement) {
      const button = root.querySelector<HTMLButtonElement>(
        '[data-action="restore-presets"]',
      );
      if (button) button.disabled = !el.checked || recoveryBackup === null;
      return;
    }
    if (el instanceof HTMLInputElement && el.type === 'file') {
      const file = el.files?.[0];
      if (!file) return;
      if (el.id === 'image-file') void setImage(file);
      else if (el.id === 'video-file') void setVideo(file);
      else if (el.id === 'json-file' || el.id === 'recovery-file') {
        const recovering = el.id === 'recovery-file';
        const backedUpRaw = recoveryBackup;
        if (
          recovering &&
          (backedUpRaw === null ||
            !root.querySelector<HTMLInputElement>('#preset-recovery-confirm')
              ?.checked)
        ) {
          notify('請先匯出原始備份，確認檔案已保存並勾選復原確認。');
          return;
        }
        if (file.size > MAX_JSON_BYTES) {
          notify('JSON 不能超過 1 MiB（1,048,576 UTF-8 bytes）。');
          return;
        }
        el.value = '';
        void file
          .text()
          .then((raw) => {
            try {
              const parsed = parseSafeJson(raw) as { format?: string } | null;
              if (recovering) {
                const restored = restorePresets(storage, raw, backedUpRaw!);
                recoveryBackup = null;
                render();
                notify(
                  `已復原 ${restored.length} 個自訂預設；原始資料請保留在已下載備份內。`,
                );
              } else if (parsed?.format === 'video-prompt-generator-presets') {
                const imported = importPresets(storage, raw);
                render();
                notify(`已匯入 ${imported.length} 個預設；原有預設已保留。`);
              } else {
                const review = reviewConfigurationImport(raw);
                if (review.migrationRequired) {
                  configurationReview = review;
                  originalConfiguration = raw;
                  renderOutput();
                  notify(
                    '舊版本已通過驗證；請先比較原提示與新提示，再確認遷移。',
                  );
                } else {
                  configurationReview = null;
                  originalConfiguration = raw;
                  adoptConfiguration(raw);
                }
              }
            } catch (error) {
              notify(resolveError(error));
            }
          })
          .catch((error) => notify(resolveError(error)));
      }
      return;
    }
    if (el instanceof HTMLInputElement && el.dataset.motion) {
      const key = el.dataset.motion as
        'subjectMotions' | 'environmentalMotions';
      plan()[key] = el.checked
        ? [...plan()[key], el.value]
        : plan()[key].filter((id) => id !== el.value);
      plan().source.elementsConfirmed = false;
      changed();
      render();
      return;
    }
    if (el instanceof HTMLInputElement && el.dataset.preserve) {
      const id = el.dataset.preserve as MotionPlan['preservation'][number];
      plan().preservation = el.checked
        ? [...plan().preservation, id]
        : plan().preservation.filter((k) => k !== id);
      changed();
      renderOutput();
      return;
    }
    if (el instanceof HTMLInputElement && el.dataset.region) {
      const r = {
        ...(plan().source.region ?? { x: 0, y: 0, width: 1, height: 1 }),
      };
      r[el.dataset.region as keyof Region] = Number(el.value) / 100;
      plan().source.region = normalizeRegion(r);
      changed();
      render();
      return;
    }
    if (
      el.dataset.field &&
      (!(el instanceof HTMLInputElement) || el.type !== 'text')
    )
      setField(
        el.dataset.field,
        el instanceof HTMLInputElement && el.type === 'checkbox'
          ? el.checked
          : el.value,
      );
  });
  root.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>(
      '[data-action]',
    );
    if (!button || button.hasAttribute('disabled')) return;
    const action = button.dataset.action;
    try {
      if (
        action === 'copy' ||
        action === 'copy-variant' ||
        action === 'copy-provider'
      ) {
        const out =
          action === 'copy'
            ? output()
            : action === 'copy-variant'
              ? generateVariations(plan()).find(
                  (v) => v.id === button.dataset.variant,
                )!.output
              : compareProviders(output().plan)[
                  button.dataset.provider as Provider
                ];
        if (errors(out)) return;
        void copyEnglish(out.english)
          .then(() => notify('已複製英文原始提示詞。'))
          .catch((error) => notify(resolveError(error)));
        return;
      }
      if (action === 'view') {
        settings.view = button.dataset.view as PromptView;
        persist();
        renderOutput();
        return;
      }
      if (action === 'variant') {
        activeVariant = button.dataset.variant as 'A' | 'B' | 'C';
        renderOutput();
        return;
      }
      if (action === 'base') {
        activeVariant = 'base';
        renderOutput();
        return;
      }
      if (action === 'mode') {
        const p = plan();
        p.mode = button.dataset.mode as MotionPlan['mode'];
        p.camera =
          p.mode === 'rotation'
            ? p.rotation.type === 'orbit'
              ? 'orbit'
              : 'locked'
            : CAMERAS_DATA.find((c) => c.id === p.camera)?.modes.includes(
                  p.mode,
                )
              ? p.camera
              : 'locked';
        p.loop = p.mode === 'cinematic' ? 'none' : 'match-pose';
        changed();
        render();
        return;
      }
      if (action === 'preset') {
        const preset = presets().find((p) => p.id === button.dataset.id);
        if (preset) {
          if (plan().presetId === preset.id &&
              motionSignature(plan()) === motionSignature(preset.plan)) {
            if (presetRestore) {
              const before = structuredClone(presetRestore);
              settings.plan = before.plan;
              presetName = before.name;
              presetRestore = null;
              notify('已取消動作預設，恢復套用前設定。');
            } else {
              plan().presetId = null;
              notify('已取消預設選取；目前設定保留。');
            }
          } else {
            presetRestore = { plan: structuredClone(plan()), name: presetName };
            settings.plan = applyPreset(plan(), preset);
            presetName = preset.nameZh;
          }
          changed();
          render();
        }
        return;
      }
      if (action === 'undo') {
        undoLastEdit();
        return;
      }
      if (action === 'clear-subject-motions' || action === 'clear-environment-motions') {
        const key = action === 'clear-subject-motions' ? 'subjectMotions' : 'environmentalMotions';
        if (!plan()[key].length) return;
        plan()[key] = [];
        const remaining = [...plan().subjectMotions, ...plan().environmentalMotions];
        if (!remaining.includes(plan().primaryMotion ?? '')) plan().primaryMotion = remaining[0] ?? null;
        plan().source.elementsConfirmed = false;
        changed();
        render();
        return;
      }
      if (action === 'reset-motions') {
        const p = plan(), defaults = defaultPlan();
        p.subjectMotions = [];
        p.environmentalMotions = [];
        p.primaryMotion = null;
        p.intensity = defaults.intensity;
        p.rotation = structuredClone(defaults.rotation);
        p.camera = 'locked';
        p.loop = p.mode === 'cinematic' ? 'none' : defaults.loop;
        p.source.elementsConfirmed = false;
        changed();
        render();
        notify('已重設動作及鏡頭設定，保留原圖、模型及主體描述。');
        return;
      }
      if (
        action === 'save-preset' ||
        action === 'duplicate-preset' ||
        action === 'update-preset'
      ) {
        const id =
          action === 'update-preset'
            ? (plan().presetId ?? undefined)
            : undefined;
        const name =
          action === 'duplicate-preset'
            ? (presetName || '動作設定') + '（副本）'
            : presetName;
        const saved = savePreset(storage, name, plan(), id);
        plan().presetId = saved.id;
        presetName = saved.nameZh;
        presetRestore = null;
        previousPlan = structuredClone(plan());
        previousPresetName = presetName;
        previousPresetRestore = null;
        persist();
        render();
        notify('自訂預設已儲存。');
        return;
      }
      if (action === 'rename-preset') {
        if (plan().presetId) {
          renamePreset(storage, plan().presetId!, presetName);
          render();
          notify('預設已重新命名。');
        }
        return;
      }
      if (action === 'delete-preset') {
        if (plan().presetId) {
          deletePreset(storage, plan().presetId!);
          plan().presetId = null;
          presetRestore = null;
          previousPlan = structuredClone(plan());
          previousPresetRestore = null;
          persist();
          render();
          notify('自訂預設已刪除。');
        }
        return;
      }
      if (action === 'export-presets') {
        downloadFile(
          'video-motion-presets.json',
          presetBundle(listCustomPresets(storage)),
        );
        return;
      }
      if (action === 'export-raw-presets') {
        const raw = rawPresetBackup(storage);
        downloadFile('video-motion-presets-raw-backup.json', raw);
        recoveryBackup = raw;
        render();
        notify(
          '已開始下載原始資料，內容沒有解析或修改；請確認備份檔案已保存。',
        );
        return;
      }
      if (action === 'restore-presets') {
        root.querySelector<HTMLInputElement>('#recovery-file')!.click();
        return;
      }
      if (action === 'export-selected') {
        const preset = presets().find((p) => p.id === plan().presetId);
        if (preset) {
          const clone: MotionPreset = {
            ...structuredClone(preset),
            category: 'custom',
            updatedAt: new Date().toISOString(),
          };
          downloadFile('video-motion-preset.json', presetBundle([clone]));
        }
        return;
      }
      if (action === 'import-json') {
        root.querySelector<HTMLInputElement>('#json-file')!.click();
        return;
      }
      if (action === 'export-json') {
        downloadFile(
          'video-motion-plan.json',
          JSON.stringify(createExport(output().plan), null, 2),
        );
        return;
      }
      if (action === 'export-text') {
        downloadFile(
          'video-prompt.txt',
          plainText(output()),
          'text/plain;charset=utf-8',
        );
        return;
      }
      if (action === 'draw') {
        drawMode = !drawMode;
        render();
        notify(
          drawMode
            ? '在圖片上拖曳框選；也可展開「主體位置」用鍵盤設定。'
            : '框選模式已關閉。',
        );
        return;
      }
      if (action === 'clear-region') {
        plan().source.region = null;
        changed();
        render();
        return;
      }
      if (action === 'remove-image') {
        dropHistoryForMediaChange();
        ++imageToken;
        image?.dispose();
        image = null;
        plan().source.image = null;
        plan().source.region = null;
        drawMode = false;
        changed();
        dropHistoryForMediaChange();
        render();
        return;
      }
      if (action === 'reset') {
        dropHistoryForMediaChange();
        ++imageToken;
        image?.dispose();
        image = null;
        drawMode = false;
        settings.plan = defaultPlan();
        presetName = '';
        changed();
        dropHistoryForMediaChange();
        render();
        notify('提示設定及原圖已重設；自訂預設仍保留。');
        return;
      }
      if (action === 'export-original-configuration' && originalConfiguration) {
        downloadFile('video-motion-plan-original.json', originalConfiguration);
        return;
      }
      if (action === 'cancel-configuration-migration') {
        configurationReview = null;
        renderOutput();
        notify('已取消遷移；目前設定及原匯出未更改。');
        return;
      }
      if (action === 'accept-configuration-migration' && configurationReview) {
        const raw = configurationReview.originalRaw;
        // Revalidate the immutable raw input at the explicit adoption boundary.
        configurationReview = null;
        adoptConfiguration(raw, true);
        return;
      }
      if (action === 'export-qc' && qc) {
        downloadFile('video-qc-report.json', qcReport(qc));
        return;
      }
      if (action === 'clear-qc') {
        clearQc();
        renderQc();
        return;
      }
      if (action === 'install') {
        if (installEvent) {
          void installEvent
            .prompt()
            .catch((error) => notify(resolveError(error)));
          installEvent = null;
        } else {
          root.querySelector<HTMLDetailsElement>('.quick-guide')!.open = true;
          notify('Chrome／Edge 使用瀏覽器「安裝」；Safari 加入 Dock／主畫面。');
        }
        return;
      }
      if (action === 'update' && applyUpdate) {
        if (!persist()) return;
        button.setAttribute('data-applying-update', 'true');
        applyUpdate();
      }
    } catch (error) {
      notify(resolveError(error));
    }
  });
  root.addEventListener('dragover', (event) => {
    if ((event.target as Element).closest('#drop-zone')) event.preventDefault();
  });
  root.addEventListener('drop', (event) => {
    if ((event.target as Element).closest('#drop-zone')) {
      event.preventDefault();
      const file = (event as DragEvent).dataTransfer?.files[0];
      if (file) void setImage(file);
    }
  });
  let drawing: {
    x: number;
    y: number;
    pointer: number;
    stage: HTMLElement;
  } | null = null;
  const point = (event: PointerEvent, stage: HTMLElement) => {
    const box = stage.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
    };
  };
  root.addEventListener('pointerdown', (event) => {
    const stage = (event.target as Element).closest<HTMLElement>(
      '#image-stage',
    );
    if (!drawMode || !stage || event.button !== 0) return;
    event.preventDefault();
    const p = point(event, stage);
    drawing = { ...p, pointer: event.pointerId, stage };
    stage.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove', (event) => {
    if (!drawing || event.pointerId !== drawing.pointer) return;
    const pos = point(event, drawing.stage),
      r = {
        x: Math.min(pos.x, drawing.x),
        y: Math.min(pos.y, drawing.y),
        width: Math.abs(pos.x - drawing.x),
        height: Math.abs(pos.y - drawing.y),
      },
      overlay = drawing.stage.querySelector<HTMLElement>('#region-overlay')!;
    overlay.hidden = false;
    Object.assign(overlay.style, {
      left: r.x * 100 + '%',
      top: r.y * 100 + '%',
      width: r.width * 100 + '%',
      height: r.height * 100 + '%',
    });
  });
  root.addEventListener('pointerup', (event) => {
    if (!drawing || event.pointerId !== drawing.pointer) return;
    const pos = point(event, drawing.stage);
    plan().source.region = normalizeRegion({
      x: Math.min(pos.x, drawing.x),
      y: Math.min(pos.y, drawing.y),
      width: Math.abs(pos.x - drawing.x),
      height: Math.abs(pos.y - drawing.y),
    });
    drawing = null;
    drawMode = false;
    changed();
    render();
  });
  root.addEventListener('pointercancel', () => {
    drawing = null;
    render();
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event as InstallEvent;
    render();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener(
    'change',
    applyTheme,
  );
  window.addEventListener('pagehide', () => {
    ++imageToken;
    image?.dispose();
    image = null;
    clearSourceSession(plan());
    previousPlan = structuredClone(plan());
    syncSourceConfirmation();
    root.querySelector<HTMLInputElement>('#image-file')!.value = '';
    drawMode = false;
    drawing = null;
    clearQc();
    dropHistoryForMediaChange();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      if (!image) { clearSourceSession(plan()); dropHistoryForMediaChange(); }
      previousPlan = structuredClone(plan());
      render();
      renderQc();
    }
    // History traversal can restore browser-owned form state after pageshow.
    // Synchronize now and on the next frame without altering a new confirmation.
    syncSourceConfirmation();
    requestAnimationFrame(syncSourceConfirmation);
  });
  render();
  void registerPwa(
    (status) => {
      pwaStatus = status;
      const el = root.querySelector('#pwa-status');
      if (el) el.textContent = status;
    },
    (apply) => {
      applyUpdate = apply;
      const banner = root.querySelector<HTMLElement>('#update-banner');
      if (banner) banner.hidden = false;
    },
  );
  if (!persistent) notify('永久儲存不可用；可使用匯出功能備份。');
}
