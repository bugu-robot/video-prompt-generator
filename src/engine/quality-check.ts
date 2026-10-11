import { MOTION_BY_ID } from '../data/motions';
import { CAMERA_BY_ID } from '../data/cameras';
import { PROVIDER_CAPABILITIES } from '../models/provider-capabilities';
import type { AuditFinding, MotionPlan } from '../models/motion-plan';
export function auditPlan(p: MotionPlan): AuditFinding[] {
  const results: AuditFinding[] = [];
  const add = (
    id: string,
    severity: AuditFinding['severity'],
    messageZh: string,
    messageEn: string,
  ) => results.push({ id, severity, messageZh, messageEn });
  const motions = [...p.subjectMotions, ...p.environmentalMotions];
  const cap = PROVIDER_CAPABILITIES[p.model];
  if (!p.source.image)
    add(
      'no-source',
      'recommendation',
      '未載入原圖。提示會以條件式動作描述；請在供應商網站自行提供原圖。',
      'No local source image is loaded; supply the actual image to the provider.',
    );
  if (!p.source.elementsConfirmed && motions.length && p.mode !== 'rotation')
    add(
      'unconfirmed-elements',
      'recommendation',
      '未確認已選元素在原圖存在；提示只會要求「如原圖已有」的動作。',
      'Selected image elements are unconfirmed; motion instructions are conditional.',
    );
  if (
    p.mode !== 'rotation' &&
    ['coffee-cup', 'window', 'tree', 'product'].includes(
      p.source.subjectType,
    ) &&
    p.subjectMotions.length
  )
    add(
      'inanimate-subject',
      'error',
      '已指定的無生命主體與眨眼／呼吸等角色動作不符；請取消主體微動作，或用角色／自訂主體描述有生命造型。',
      'The selected inanimate subject is incompatible with character micro-movements.',
    );
  if (!motions.length && p.mode !== 'rotation' && p.camera === 'locked')
    add(
      'no-motion',
      'recommendation',
      '目前沒有動作。可選一個主要動作，或保留為近乎靜止的鏡頭。',
      'No animation is selected for this static shot.',
    );
  if (motions.length > 4 && p.mode !== 'rotation')
    add(
      'motion-count',
      'warning',
      '獨立動作較多；建議保留一個主要動作及一至兩個次要動作。',
      'Many independent motions are selected; prioritize one primary and one or two secondary motions.',
    );
  for (const id of motions)
    for (const other of MOTION_BY_ID.get(id)?.conflicts ?? []) {
      if (motions.includes(other) && id < other)
        add(
          'motion-conflict-' + id + '-' + other,
          'error',
          `${MOTION_BY_ID.get(id)?.nameZh}與${MOTION_BY_ID.get(other)?.nameZh}互相衝突，請先取消其中一項。`,
          'Conflicting subject movements must be resolved before copying.',
        );
    }
  if (p.mode === 'rotation') {
    if (p.source.subjectType === 'unspecified' && !p.source.subjectEn)
      add(
        'rotation-subject',
        'error',
        '旋轉模式須先選擇或填寫旋轉主體；框選位置本身不能描述物件。',
        'Select or describe the rotation subject.',
      );
    if (p.rotation.inputMode === 'single')
      add(
        'hidden-surfaces',
        'warning',
        '單張圖沒有背面幾何資料；90°／180°／360°都可能重建失真，完整旋轉須人手 QC。',
        'Hidden surfaces are not verified by one image; reconstruction and rotation completion require manual QC.',
      );
    if (p.rotation.inputMode === '3d')
      add(
        'true-3d',
        'recommendation',
        '需要準確幾何時，請用 Blender 等 3D renderer；此處只提供 AI 提示，不能讀取或渲染 3D 模型。',
        'Use external 3D rendering for geometrically exact rotation; this generator does not render 3D assets.',
      );
    if (p.rotation.angle === 360)
      add(
        'rotation-completion',
        'warning',
        '要求一圈並不證明影片實際轉足 360°；須檢查完整時間線，不能只比較首尾幀。',
        'A full-revolution prompt does not prove a completed 360° turn; review the whole timeline.',
      );
    if (p.rotation.angle !== 360 && p.rotation.returnToStart)
      add(
        'partial-return',
        'error',
        '90°／180°的單向旋轉不能同時回到起始方向；請取消回到起點或選 360°。',
        'A partial one-way rotation cannot end at its starting orientation.',
      );
    if (
      p.rotation.angle === 360 &&
      p.loop !== 'none' &&
      p.rotation.speed === 'ease'
    )
      add(
        'eased-rotation-loop',
        'warning',
        '淡入淡出的旋轉速度會在接點減速；循環通常較適合等速。',
        'Easing slows the boundary; uniform angular speed is usually easier to loop.',
      );
    if (
      (p.rotation.type === 'turntable' && p.camera !== 'locked') ||
      (p.rotation.type === 'orbit' && p.camera !== 'orbit')
    )
      add(
        'rotation-camera',
        'error',
        '物件自轉與鏡頭繞行的鏡頭設定互相衝突；請重新選擇旋轉類型。',
        'Rotation type conflicts with the camera instruction.',
      );
    if (p.rotation.type === 'orbit' && p.rotation.axis === 'z')
      add(
        'z-orbit',
        'warning',
        'Z 軸繞行是近似沿視線的特殊路徑；如想物件平面自轉，請用物件自轉模式。',
        'A depth-axis orbit is unusual; use turntable mode for in-plane object rotation.',
      );
    if (p.subjectMotions.length || p.environmentalMotions.length)
      add(
        'rotation-isolation',
        'recommendation',
        '旋轉模式只輸出旋轉動作；其他模式所選微動作仍保留，切換回去時可繼續使用。',
        'Rotation isolates the requested turn; ambient selections are retained for the other modes.',
      );
    if (p.rotation.inputMode === 'references') {
      const state = cap.consumer.references.status;
      add(
        'reference-' + state,
        state === 'unsupported' ? 'error' : 'warning',
        state === 'supported'
          ? '請在 Flow Ingredients 手動提供多角度參考圖；它與 Frames 首幀工作流程不同，不能假定同時鎖定首幀。'
          : state === 'unsupported'
            ? '所選模型明確未支援 References；請換模型或改用單張圖。'
            : '供應商網站多角度參考圖支援未核實；API 文件不能當成網站支援。',
        'Multiple views must be supplied manually in a supported external reference workflow; they are not attached by this app.',
      );
      if (
        p.provider === 'veo' &&
        cap.consumer.references.status === 'supported' &&
        p.durationSeconds !== null &&
        p.durationSeconds !== 8
      )
        add(
          'reference-duration',
          'error',
          'Flow Veo 的 Ingredients 工作流程只列出 8 秒，請改時長或改用首幀。',
          'Flow Veo reference workflows list 8-second clips only.',
        );
    }
  }
  if (
    p.mode !== 'rotation' &&
    p.loop !== 'none' &&
    CAMERA_BY_ID.get(p.camera)?.loopRisk
  )
    add(
      'loop-camera',
      'warning',
      '鏡頭移動會改變首尾構圖，單向推近／橫移通常不能直接無縫循環；建議固定鏡頭或剪輯淡化。',
      'Camera movement changes boundary framing; use a locked shot or an editing crossfade.',
    );
  if (
    p.mode === 'ambient' &&
    !CAMERA_BY_ID.get(p.camera)?.modes.includes('ambient')
  )
    add(
      'ambient-camera',
      'error',
      '這個鏡頭動作屬進階電影模式，請切換模式或使用固定鏡頭。',
      'This camera move requires cinematic mode.',
    );
  if (
    p.mode !== 'rotation' &&
    p.subjectMotions.some((id) => MOTION_BY_ID.get(id)?.highRisk) &&
    p.intensity === 'moderate'
  )
    add(
      'deformation',
      'warning',
      '較明顯的頭部／手掌／姿勢動作有變形風險；檢查面部與肢體比例。',
      'More visible articulation may deform identity or anatomy.',
    );
  if (
    p.environmentalMotions.includes('light') &&
    p.preservation.includes('lighting') &&
    p.mode !== 'rotation'
  )
    add(
      'lighting-tension',
      'recommendation',
      '保留的是光源位置和方向；環境光微變會改變亮度。如須逐幀同亮度，請取消環境光微變。',
      'Lighting setup is preserved, but selected ambient variation changes brightness.',
    );
  if (p.durationSeconds !== null) {
    if (
      cap.consumerDurations &&
      !cap.consumerDurations.includes(p.durationSeconds)
    )
      add(
        'duration-unsupported',
        'error',
        '所選 Flow 模型官方時長不包括這個偏好；請在此更改時長。',
        'Requested duration is not listed for this Flow model.',
      );
    if (!cap.consumerDurations)
      add(
        'duration-unverified',
        'warning',
        '這只是時長偏好；網站可用秒數未核實，請在外部網站確認。',
        'This is a duration preference; available consumer durations are unverified.',
      );
    if (p.durationSeconds > 15)
      add(
        'duration-complexity',
        'warning',
        '較長片段增加外觀漂移風險；可先測試較短片段再剪輯。',
        'Long clips increase continuity risk; consider shorter acceptance trials.',
      );
  }
  if (cap.consumer.imageToVideo.status !== 'supported')
    add(
      'i2v-unverified',
      'warning',
      'Grok 網站的當前 Image-to-Video 入口及版本未經此研究確認；請自行核對，勿套用 API 規格。',
      'Current Grok website image-to-video controls are not verified by the API documentation.',
    );
  if (p.loop !== 'none')
    add(
      'loop-guarantee',
      'recommendation',
      'Loop-friendly 是創作意圖，不能保證數學上無縫；生成後應檢查動作及接點。',
      'Loop-friendly is an intention, not a seamless-loop guarantee.',
    );
  if (p.audio === 'none-requested')
    add(
      'audio-removal',
      'recommendation',
      '未要求音訊不等於保證靜音；配 Jazz 音樂時可在最後渲染移除生成音軌。',
      'No requested audio is not a silence guarantee; remove generated audio during rendering.',
    );
  const notes = p.source.sceneNotesEn.toLowerCase();
  if (
    (/(?:locked|static|fixed)\s+(?:camera|shot)/.test(notes) &&
      p.camera !== 'locked') ||
    (/\b(?:pan|push.?in|orbit|dolly|pull.?out)\b/.test(notes) &&
      p.camera === 'locked')
  )
    add(
      'notes-camera-conflict',
      'error',
      '英文補充描述包含與所選鏡頭相反的指示；請修改補充描述。',
      'Free-text notes conflict with the selected camera.',
    );
  if (
    /\b(?:vigorous|violent|fast movement|no movement|completely still)\b/.test(
      notes,
    ) &&
    motions.length &&
    p.mode !== 'rotation'
  )
    add(
      'notes-intensity',
      'warning',
      '補充文字可能與微動作強度互相矛盾；自由文字只作有限關鍵字檢查。',
      'Notes may conflict with motion intensity; free text has only limited keyword checks.',
    );
  if (p.source.subjectType === 'custom' && !p.source.subjectEn)
    add(
      'custom-subject',
      'error',
      '自訂主體須填寫英文名稱；中文名稱只作解讀。',
      'A custom subject requires an English description.',
    );
  if (p.source.sceneNotesZh && !p.source.sceneNotesEn)
    add(
      'zh-notes-only',
      'recommendation',
      '中文補充只作解讀，沒有英文內容時不會加入供應商 prompt；請自行填寫英文。',
      'Chinese notes are interpretation only; add English notes for the provider prompt.',
    );
  return results;
}
