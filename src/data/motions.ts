export interface MotionDefinition {
  id: string; kind: 'subject' | 'environment'; nameEn: string; nameZh: string;
  en: string; zh: string; elementEn: string; elementZh: string; conflicts?: string[]; highRisk?: boolean;
}
export const MOTIONS: readonly MotionDefinition[] = [
  {id:'blink', kind:'subject', nameEn:'Natural blinking', nameZh:'自然眨眼', en:'blink naturally at relaxed intervals', zh:'以放鬆的節奏自然眨眼', elementEn:'a subject with visible eyelids', elementZh:'有可見眼瞼的主體', conflicts:['sleep']},
  {id:'breathing', kind:'subject', nameEn:'Gentle breathing', nameZh:'輕柔呼吸', en:'breathe gently with small chest movement', zh:'輕柔呼吸，胸口只有細小起伏', elementEn:'a breathing character or animal', elementZh:'會呼吸的角色或動物'},
  {id:'head', kind:'subject', nameEn:'Small head movement', nameZh:'微微轉頭', en:'make a small head turn and settle naturally', zh:'微微轉頭後自然停定', elementEn:'a character or animal with a visible head', elementZh:'有可見頭部的角色或動物', highRisk:true},
  {id:'look', kind:'subject', nameEn:'Looking around', nameZh:'輕輕環顧', en:'shift its gaze gently while keeping its body in place', zh:'視線輕輕移動，身體留在原位', elementEn:'a character or animal with visible eyes', elementZh:'有可見眼睛的角色或動物', conflicts:['sleep']},
  {id:'ears', kind:'subject', nameEn:'Subtle ear movement', nameZh:'耳朵微動', en:'make an occasional small ear twitch', zh:'偶爾輕輕郁動耳朵', elementEn:'a subject with visible ears', elementZh:'有可見耳朵的主體'},
  {id:'tail', kind:'subject', nameEn:'Gentle tail movement', nameZh:'尾巴輕擺', en:'sway its tail gently without shifting its body', zh:'身體不移位，尾巴輕輕擺動', elementEn:'a subject with a visible tail', elementZh:'有可見尾巴的主體'},
  {id:'paw', kind:'subject', nameEn:'Small hand or paw movement', nameZh:'手掌／貓掌微動', en:'make a small relaxed hand or paw adjustment', zh:'輕鬆地微微調整手掌或爪的位置', elementEn:'a subject with visible hands or paws', elementZh:'有可見手掌或爪的主體', highRisk:true},
  {id:'fur', kind:'subject', nameEn:'Hair or fur movement', nameZh:'毛髮輕動', en:'let existing hair or fur move softly', zh:'讓原有毛髮輕輕郁動', elementEn:'visible hair or fur', elementZh:'可見的毛髮'},
  {id:'sleep', kind:'subject', nameEn:'Sleeping motion', nameZh:'熟睡呼吸', en:'remain asleep with eyes closed and gentle rhythmic breathing', zh:'閉眼熟睡，只作輕柔規律呼吸', elementEn:'a sleeping character or animal', elementZh:'熟睡的角色或動物', conflicts:['blink','look','gesture','breathing']},
  {id:'gesture', kind:'subject', nameEn:'Small natural gestures', nameZh:'細小自然動作', en:'make a small natural gesture and relax back into its original pose', zh:'作細小自然動作，再放鬆回到原來姿勢', elementEn:'a character or animal', elementZh:'角色或動物', conflicts:['sleep'], highRisk:true},
  {id:'steam', kind:'environment', nameEn:'Coffee steam', nameZh:'咖啡蒸氣', en:'thin steam drifts upward softly', zh:'細薄蒸氣柔和地向上飄', elementEn:'a steaming drink', elementZh:'有蒸氣的飲品'},
  {id:'rain', kind:'environment', nameEn:'Window raindrops', nameZh:'窗上雨滴', en:'raindrops slide slowly down the existing window', zh:'雨滴沿原有窗戶慢慢滑落', elementEn:'a rain-covered window', elementZh:'帶雨滴的窗戶'},
  {id:'leaves', kind:'environment', nameEn:'Falling leaves', nameZh:'秋葉飄落', en:'a few existing autumn leaves drift down at relaxed intervals', zh:'少量原有秋葉以放鬆的節奏飄落', elementEn:'autumn leaves', elementZh:'秋葉'},
  {id:'snow', kind:'environment', nameEn:'Gentle snowfall', nameZh:'輕柔飄雪', en:'light snow falls steadily without accumulating visibly', zh:'細雪穩定飄落，不出現明顯積雪變化', elementEn:'a snowy outdoor scene', elementZh:'飄雪的戶外景物'},
  {id:'fire', kind:'environment', nameEn:'Fireplace flames', nameZh:'壁爐火焰', en:'the existing fireplace flames flicker gently', zh:'原有壁爐火焰輕輕跳動', elementEn:'a lit fireplace', elementZh:'已點燃的壁爐'},
  {id:'candle', kind:'environment', nameEn:'Candle flicker', nameZh:'燭光閃動', en:'the existing candle flame flickers gently', zh:'原有燭火輕輕跳動', elementEn:'a lit candle', elementZh:'已點燃的蠟燭'},
  {id:'trees', kind:'environment', nameEn:'Tree movement', nameZh:'樹枝輕搖', en:'the existing branches sway softly in a gentle breeze', zh:'原有樹枝隨微風輕輕搖動', elementEn:'visible trees', elementZh:'可見的樹木'},
  {id:'ripples', kind:'environment', nameEn:'Water ripples', nameZh:'水面漣漪', en:'small ripples travel gently across the existing water surface', zh:'細小漣漪輕輕沿原有水面移動', elementEn:'a water surface', elementZh:'水面'},
  {id:'waves', kind:'environment', nameEn:'Ocean waves', nameZh:'海浪起伏', en:'the existing ocean waves roll at a calm, consistent pace', zh:'原有海浪以平靜穩定的節奏起伏', elementEn:'a visible ocean', elementZh:'可見的海洋'},
  {id:'clouds', kind:'environment', nameEn:'Moving clouds', nameZh:'雲朵緩移', en:'the existing clouds drift slowly across the sky', zh:'原有雲朵在天空慢慢飄動', elementEn:'visible clouds', elementZh:'可見的雲朵'},
  {id:'curtains', kind:'environment', nameEn:'Curtain movement', nameZh:'窗簾輕擺', en:'the existing curtains sway slightly in a light breeze', zh:'原有窗簾隨微風微微擺動', elementEn:'visible curtains', elementZh:'可見的窗簾'},
  {id:'particles', kind:'environment', nameEn:'Atmospheric particles', nameZh:'空氣微粒', en:'a sparse amount of existing dust or atmospheric particles drifts slowly', zh:'少量原有塵埃或空氣微粒緩慢飄浮', elementEn:'visible dust or atmospheric particles', elementZh:'可見塵埃或空氣微粒'},
  {id:'light', kind:'environment', nameEn:'Ambient lighting variation', nameZh:'環境光微變', en:'ambient light varies softly within the original lighting setup', zh:'在原有佈光中，環境光柔和地微變', elementEn:'existing ambient light', elementZh:'原有環境光'},
];
export const MOTION_BY_ID = new Map(MOTIONS.map(m => [m.id,m]));
export const SUBJECT_MOTIONS = MOTIONS.filter(m => m.kind === 'subject');
export const ENVIRONMENTAL_MOTIONS = MOTIONS.filter(m => m.kind === 'environment');
