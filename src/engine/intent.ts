import type {
  MotionPlan,
  PromptSection,
  Preservation,
} from '../models/motion-plan';
import { MOTION_BY_ID } from '../data/motions';
import { CAMERA_BY_ID } from '../data/cameras';
import { PRESERVATION_LABELS, SUBJECT_LABELS } from '../i18n/zh-HK';
import { loopSection } from './loop-rules';
export function section(
  id: string,
  titleEn: string,
  titleZh: string,
  en: string,
  zh: string,
): PromptSection {
  return { id, titleEn, titleZh, en, zh };
}
export function subject(p: MotionPlan): { en: string; zh: string } {
  return {
    en: p.source.subjectEn || SUBJECT_LABELS[p.source.subjectType].en,
    zh:
      p.source.subjectZh ||
      SUBJECT_LABELS[p.source.subjectType].zh +
        (p.source.subjectEn ? '（英文主體：' + p.source.subjectEn + '）' : ''),
  };
}
const intensityText = {
  minimal: {
    en: 'Use the smallest natural movement amplitude.',
    zh: '使用極少、自然的動作幅度。',
  },
  subtle: {
    en: 'Keep movement subtle and restrained.',
    zh: '動作保持細微而克制。',
  },
  moderate: {
    en: 'Use clearly readable but controlled movement, without exaggerated action.',
    zh: '動作可以明顯可見，但保持受控，避免誇張。',
  },
};
const timingText = {
  sparse: {
    en: 'Make character gestures brief and infrequent; keep selected continuous environmental motion very faint.',
    zh: '角色動作短暫而疏落；所選連續環境動作保持十分微弱。',
  },
  natural: {
    en: 'Let selected movements recur at relaxed, natural intervals.',
    zh: '讓所選動作以放鬆、自然的節奏重現。',
  },
  sustained: {
    en: 'Keep the selected environmental movement active throughout; allow character gestures to last longer within the chosen intensity, with natural rests.',
    zh: '所選環境動作持續進行；在所選強度內，角色動作維持較長時間並有自然休息。',
  },
};
const compactIntensity = {
  minimal: {
    en: 'Use the smallest natural amplitude.',
    zh: '幅度極少而自然。',
  },
  subtle: { en: 'Keep motion subtle.', zh: '幅度細微。' },
  moderate: {
    en: 'Keep motion readable and controlled, not exaggerated.',
    zh: '幅度明顯、受控，不誇張。',
  },
};
const compactTiming = {
  sparse: {
    en: 'Brief, infrequent gestures; very faint continuous environment motion.',
    zh: '動作短暫疏落；連續環境動作十分微弱。',
  },
  natural: {
    en: 'Recur at relaxed, natural intervals.',
    zh: '放鬆自然地重現。',
  },
  sustained: {
    en: 'Sustain environment motion; longer gestures with natural rests at the chosen amplitude.',
    zh: '環境持續活動；所選幅度內的動作較長，有自然休息。',
  },
};
const compactCamera = {
  locked: {
    en: 'Keep the camera locked on a static tripod.',
    zh: '靜止腳架，鏡頭固定。',
  },
  'push-in': {
    en: 'Very slow, controlled camera push-in.',
    zh: '鏡頭十分緩慢、受控地推近。',
  },
  'pull-out': {
    en: 'Very slow, controlled camera pull-out.',
    zh: '鏡頭十分緩慢、受控地拉遠。',
  },
  pan: {
    en: 'Gently pan left to right across the existing scene.',
    zh: '鏡頭輕柔地由左至右掃過原有場景。',
  },
  tilt: {
    en: 'Gently tilt upward from a fixed camera position.',
    zh: '鏡頭固定位置，輕柔地向上轉動視線。',
  },
  parallax: {
    en: 'Small, controlled lateral camera move; subtle parallax of existing foreground/background layers.',
    zh: '受控輕微側移，原有前後景出現細小視差。',
  },
  dolly: {
    en: 'Slow sideways camera dolly on a stable path through the existing scene.',
    zh: '鏡頭沿穩定路徑慢慢側移。',
  },
  orbit: {
    en: 'Slow, gentle camera arc around the stationary selected subject.',
    zh: '主體固定，鏡頭沿緩慢弧線繞行。',
  },
};
function detailedContinuity(p: MotionPlan): { en: string; zh: string } {
  if (p.mode === 'rotation')
    return {
      en:
        p.rotation.angle === 360
          ? 'Show progressive intermediate orientations along the requested revolution, rather than substituting a static matching endpoint. Keep the requested angular-speed profile across that path.'
          : 'Show progressive intermediate orientations along the requested one-way partial turn. Do not add a reverse leg or reset the orientation to imitate a closed path.',
      zh:
        p.rotation.angle === 360
          ? '沿要求的一圈逐步呈現中間方向，不以靜止而相配的尾幀代替旋轉；全程遵守所選角速度規則。'
          : '沿單向部分旋轉逐步呈現中間方向，不加入反轉回程或重設方向來冒充閉合路徑。',
    };
  if (!p.subjectMotions.length && !p.environmentalMotions.length)
    return {
      en: 'Continue the chosen camera behavior without introducing unselected actions.',
      zh: '延續所選鏡頭行為，不加入未選動作。',
    };
  return {
    en:
      p.motionTiming === 'sparse'
        ? 'Separate brief gestures with natural rests; maintain only the faint selected continuous environmental motion between gestures.'
        : p.motionTiming === 'sustained'
          ? 'Let the selected environmental actions continue between longer character gestures and their natural rests; keep the chosen amplitude throughout.'
          : 'Let recurring actions develop smoothly at natural intervals, with coherent intermediate poses rather than sudden jumps between poses.',
    zh:
      p.motionTiming === 'sparse'
        ? '短動作之間自然休息；期間只維持所選十分微弱的連續環境動作。'
        : p.motionTiming === 'sustained'
          ? '角色較長動作及休息期間，所選環境動作持續；全程維持所選幅度。'
          : '動作以自然間距平滑重現，中間姿勢連貫，不突然跳到另一姿勢。',
  };
}
export interface MotionCue {
  kind: 'subject' | 'environment';
  primary: boolean;
  subjectEn: string;
  subjectZh: string;
  actionEn: string;
  actionZh: string;
  conditionEn: string;
  conditionZh: string;
}
export type MotionExpression = (
  cue: MotionCue,
  concise: boolean,
) => { en: string; zh: string };
function motionSection(
  p: MotionPlan,
  kind: 'subject' | 'environment',
  express: MotionExpression,
): PromptSection | null {
  const ids = kind === 'subject' ? p.subjectMotions : p.environmentalMotions;
  if (!ids.length) return null;
  const ordered = [...ids].sort((a, b) =>
    a === p.primaryMotion ? -1 : b === p.primaryMotion ? 1 : 0,
  );
  const s = subject(p);
  const lines = ordered.flatMap((id) => {
    const m = MOTION_BY_ID.get(id);
    if (!m) return [];
    return [
      express(
        {
          kind,
          primary: id === p.primaryMotion,
          subjectEn: s.en,
          subjectZh: s.zh,
          actionEn: m.en,
          actionZh: m.zh,
          conditionEn: p.source.elementsConfirmed
            ? ''
            : `If ${m.elementEn} is already visible in the source image, `,
          conditionZh: p.source.elementsConfirmed
            ? ''
            : `如原圖已有${m.elementZh}，`,
        },
        p.length === 'concise',
      ),
    ];
  });
  return section(
    kind === 'subject' ? 'subject' : 'environment',
    kind === 'subject' ? 'Subject motion' : 'Environmental motion',
    kind === 'subject' ? '主體動作' : '環境動作',
    lines.map((l) => l.en).join(' '),
    lines.map((l) => l.zh).join(' '),
  );
}
export function rotationSection(p: MotionPlan): PromptSection {
  const r = p.rotation,
    s = subject(p),
    directionEn =
      r.direction === 'clockwise' ? 'clockwise' : 'counterclockwise',
    directionZh = r.direction === 'clockwise' ? '順時針' : '逆時針';
  const axisEn = {
    y: 'vertical Y-axis',
    x: 'horizontal X-axis',
    z: 'depth Z-axis aligned with the viewing direction',
  }[r.axis];
  const conventionEn = `Viewed from the positive ${r.axis.toUpperCase()}-axis toward the object center.`;
  const conventionZh = `方向以從正 ${r.axis.toUpperCase()} 軸望向物件中心為準。`;
  const axisZh = { y: '垂直 Y 軸', x: '水平 X 軸', z: '沿視線的深度 Z 軸' }[
    r.axis
  ];
  const pathEn =
    r.type === 'turntable'
      ? `Rotate ${s.en} itself ${directionEn} through ${r.angle} degrees around its own ${axisEn}; the camera remains stationary.`
      : `Keep ${s.en} stationary; move the camera ${directionEn} through a ${r.angle}-degree orbit around the object's ${axisEn}.`;
  const pathZh =
    r.type === 'turntable'
      ? `${s.zh}本身沿自己的${axisZh}${directionZh}旋轉 ${r.angle}°；鏡頭保持靜止。`
      : `${s.zh}留在原位；鏡頭繞物件的${axisZh}${directionZh}移動 ${r.angle}°。`;
  const speedEn =
    p.length === 'concise' && r.speed !== 'ease'
      ? r.speed === 'uniform'
        ? 'Use uniform angular speed, including the boundary.'
        : 'Use slow, steady angular movement.'
      : r.speed === 'uniform'
        ? 'Maintain uniform angular speed throughout, including the clip boundary.'
        : r.speed === 'slow'
          ? 'Use slow, steady angular movement throughout.'
          : p.motionTiming === 'sparse'
            ? 'Use very gentle acceleration and deceleration, with a long steady middle portion.'
            : p.motionTiming === 'sustained'
              ? 'Use a clearly defined smooth ease-in and ease-out, with a shorter steady middle portion.'
              : 'Use smooth, symmetrical ease-in and ease-out.';
  const speedZh =
    p.length === 'concise' && r.speed !== 'ease'
      ? r.speed === 'uniform'
        ? '等角速度，包括接點。'
        : '緩慢、穩定轉動。'
      : r.speed === 'uniform'
        ? '全程保持等角速度，包括片段接點。'
        : r.speed === 'slow'
          ? '全程以緩慢而穩定的角度速度移動。'
          : p.motionTiming === 'sparse'
            ? '十分輕柔地加速與減速，中間較長時間等速。'
            : p.motionTiming === 'sustained'
              ? '以較清楚、平滑的加速和減速，中間等速部分較短。'
              : '使用平滑、對稱的加速和減速。';
  const constraints: { en: string; zh: string }[] = [];
  if (r.centered)
    constraints.push({ en: 'Keep the object centered.', zh: '物件保持置中。' });
  if (r.stableFraming)
    constraints.push({
      en:
        p.length === 'concise'
          ? 'Keep framing stable; no abrupt reframing.'
          : 'Keep the framing stable without abrupt reframing.',
      zh: '構圖穩定，不突然重新取景。',
    });
  if (r.consistentScale)
    constraints.push({
      en:
        p.length === 'concise'
          ? 'Keep apparent object scale constant.'
          : 'Maintain consistent apparent object scale.',
      zh: '物件在畫面中的大小保持一致。',
    });
  if (r.stableLighting)
    constraints.push({
      en: 'Keep lighting sources fixed in the scene.',
      zh: '光源保持固定在場景中。',
    });
  if (r.geometry)
    constraints.push({
      en:
        p.length === 'concise'
          ? 'Preserve visible geometry and proportions.'
          : 'Preserve the visible object geometry and proportions during the turn.',
      zh: '旋轉時保留可見物件幾何與比例。',
    });
  if (r.details)
    constraints.push({
      en:
        p.length === 'concise'
          ? 'Retain identifying markings and materials.'
          : 'Retain the identifying markings and material details.',
      zh: '保留辨識標記及材質細節。',
    });
  if (r.angle === 360)
    constraints.push({
      en: 'Complete one full revolution.',
      zh: '完成完整一圈。',
    });
  if (r.returnToStart && r.angle === 360)
    constraints.push({
      en:
        r.type === 'turntable'
          ? 'Finish at the starting object orientation.'
          : 'Finish at the starting camera position and viewing direction.',
      zh:
        r.type === 'turntable'
          ? '結束時回到物件的起始方向。'
          : '結束時回到鏡頭的起始位置和視線。',
    });
  return section(
    'rotation',
    r.type === 'turntable' ? 'Object turntable' : 'Camera orbit',
    r.type === 'turntable' ? '物件自轉' : '鏡頭繞行',
    [pathEn, conventionEn, speedEn, ...constraints.map((c) => c.en)].join(' '),
    [pathZh, conventionZh, speedZh, ...constraints.map((c) => c.zh)].join(' '),
  );
}
function preservationSection(p: MotionPlan): PromptSection | null {
  const character =
    ['character', 'cat'].includes(p.source.subjectType) ||
    (p.mode !== 'rotation' && p.subjectMotions.length > 0);
  const applicable = p.preservation.filter((id) => {
    if (id === 'face') return character;
    if (id === 'identity') return character || p.mode === 'rotation';
    if (id === 'proportions' && p.mode === 'rotation' && p.rotation.geometry)
      return false;
    if (id === 'lighting' && p.mode === 'rotation' && p.rotation.stableLighting)
      return false;
    if (
      id === 'composition' &&
      p.mode === 'rotation' &&
      p.rotation.stableFraming
    )
      return false;
    return true;
  });
  if (!applicable.length) return null;
  const label = (id: Preservation): { en: string; zh: string } =>
    id === 'composition' && p.camera !== 'locked'
      ? {
          en: 'relative scene layout during camera movement',
          zh: '鏡頭移動時的場景相對佈局',
        }
      : PRESERVATION_LABELS[id];
  const en = applicable.map((id) => label(id).en).join(', '),
    zh = applicable.map((id) => label(id).zh).join('、');
  return section(
    'preservation',
    'Preserve from source',
    '原圖保留項目',
    `Preserve ${en} from the source image${!p.source.elementsConfirmed && character ? ', where those features are visible' : ''}.`,
    `保留原圖的${zh}${!p.source.elementsConfirmed && character ? '（只適用於原圖可見的特徵）' : ''}。`,
  );
}
export function intentSections(
  p: MotionPlan,
  express: MotionExpression,
): PromptSection[] {
  const sections: PromptSection[] = [];
  if (p.source.region) {
    const r = p.source.region,
      cx = r.x + r.width / 2,
      cy = r.y + r.height / 2;
    const horizontal = cx < 0.33 ? 'left' : cx > 0.67 ? 'right' : 'central',
      vertical = cy < 0.33 ? 'upper' : cy > 0.67 ? 'lower' : 'middle';
    const zoneEn = `${vertical}-${horizontal}`,
      zoneZh =
        { upper: '上方', middle: '中間', lower: '下方' }[vertical] +
        { left: '左側', central: '中央', right: '右側' }[horizontal];
    sections.push(
      section(
        'region',
        'Selected subject',
        '指定主體',
        `The intended subject is ${subject(p).en} in the ${zoneEn} area of the source image.`,
        `指定主體是原圖${zoneZh}的${subject(p).zh}；框選位置只是描述，不是供應商遮罩。`,
      ),
    );
  }
  if (p.mode === 'rotation') sections.push(rotationSection(p));
  else {
    const camera = CAMERA_BY_ID.get(p.camera)!;
    sections.push(
      section(
        'camera',
        'Camera',
        '鏡頭',
        p.length === 'concise' ? compactCamera[p.camera].en : camera.en,
        p.length === 'concise' ? compactCamera[p.camera].zh : camera.zh,
      ),
    );
    const a = motionSection(p, 'subject', express),
      b = motionSection(p, 'environment', express);
    if (a) sections.push(a);
    if (b) sections.push(b);
    if (a || b) {
      const level = intensityText[p.intensity],
        timing = timingText[p.motionTiming];
      sections.push(
        section(
          'pacing',
          'Motion scale and timing',
          '動作幅度與節奏',
          p.length === 'concise'
            ? compactIntensity[p.intensity].en +
                ' ' +
                compactTiming[p.motionTiming].en
            : level.en + ' ' + timing.en,
          p.length === 'concise'
            ? compactIntensity[p.intensity].zh +
                compactTiming[p.motionTiming].zh
            : level.zh + timing.zh,
        ),
      );
    }
  }
  if (p.durationSeconds !== null)
    sections.push(
      section(
        'duration',
        'Timing preference',
        '時長偏好',
        p.length === 'concise'
          ? `Pace over about ${p.durationSeconds} seconds.`
          : `Pace this movement over approximately ${p.durationSeconds} seconds.`,
        `以約 ${p.durationSeconds} 秒安排動作；真正時長須在供應商控制項設定。`,
      ),
    );
  const preserve = preservationSection(p);
  if (preserve) sections.push(preserve);
  const loop = loopSection(p);
  if (loop) sections.push(loop);
  if (p.source.sceneNotesEn)
    sections.push(
      section(
        'notes',
        'User scene notes',
        '使用者補充',
        p.source.sceneNotesEn,
        p.source.sceneNotesZh ||
          '未提供中文補充；英文原文：' + p.source.sceneNotesEn,
      ),
    );
  if (p.audio === 'none-requested')
    sections.push(
      section(
        'audio',
        'Audio intention',
        '音訊意圖',
        p.length === 'concise'
          ? 'Visual motion only; no audio is requested.'
          : 'Focus on visual motion; no audio is requested.',
        '以視覺動作為主，沒有要求音訊；不保證輸出靜音。',
      ),
    );
  if (p.audio === 'ambient')
    sections.push(
      section(
        'audio',
        'Audio intention',
        '音訊意圖',
        p.length === 'concise'
          ? 'If generated, use natural ambient sound for the visible scene, without music or speech.'
          : 'If audio is generated, use only natural ambient sound appropriate to the visible scene, without added music or speech.',
        '如有生成音訊，只用適合可見場景的自然環境聲，不另加音樂或說話。',
      ),
    );
  if (p.length === 'detailed')
    sections.push(
      section(
        'continuity',
        'Temporal continuity',
        '時間連續性',
        'Use one continuous shot. Keep motion causally connected from frame to frame, with no abrupt cuts or unrelated transitions. ' +
          detailedContinuity(p).en,
        '使用單一連續鏡頭；每幀動作自然相接，不突然切鏡或加入無關轉場。' +
          detailedContinuity(p).zh,
      ),
    );
  return sections;
}
