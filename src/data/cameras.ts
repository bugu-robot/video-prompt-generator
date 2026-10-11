import type { CameraMovement, GenerationMode } from '../models/motion-plan';
export interface CameraDefinition {
  id: CameraMovement;
  nameZh: string;
  en: string;
  zh: string;
  modes: GenerationMode[];
  loopRisk: boolean;
}
export const CAMERAS_DATA: readonly CameraDefinition[] = [
  {
    id: 'locked',
    nameZh: '固定鏡頭 · 靜止腳架',
    en: 'Keep the camera locked on a static tripod throughout the shot.',
    zh: '全程使用靜止腳架，鏡頭固定。',
    modes: ['ambient', 'cinematic'],
    loopRisk: false,
  },
  {
    id: 'push-in',
    nameZh: '慢慢推近 · 看清細節',
    en: 'Move the camera forward in a very slow, controlled push-in.',
    zh: '鏡頭以十分緩慢、受控的方式向前推近。',
    modes: ['ambient', 'cinematic'],
    loopRisk: true,
  },
  {
    id: 'pull-out',
    nameZh: '慢慢拉遠 · 展示環境',
    en: 'Move the camera backward in a very slow, controlled pull-out.',
    zh: '鏡頭以十分緩慢、受控的方式向後拉遠。',
    modes: ['ambient', 'cinematic'],
    loopRisk: true,
  },
  {
    id: 'pan',
    nameZh: '輕柔橫移視線',
    en: 'Pan the camera gently across the existing scene from left to right.',
    zh: '鏡頭由左至右輕柔地掃過原有場景。',
    modes: ['ambient', 'cinematic'],
    loopRisk: true,
  },
  {
    id: 'tilt',
    nameZh: '輕柔上下轉動視線',
    en: 'Tilt the camera gently upward while staying in the same position.',
    zh: '鏡頭保持原位，輕柔地向上轉動視線。',
    modes: ['ambient', 'cinematic'],
    loopRisk: true,
  },
  {
    id: 'parallax',
    nameZh: '輕微景深位移 · 前後景錯開',
    en: 'Use a small controlled lateral camera movement for subtle parallax between existing foreground and background layers.',
    zh: '鏡頭受控地輕微側移，讓原有前景和背景出現細小視差。',
    modes: ['ambient', 'cinematic'],
    loopRisk: true,
  },
  {
    id: 'dolly',
    nameZh: '慢慢側移 · 像沿軌道滑動',
    en: 'Dolly the camera slowly sideways on a stable path through the existing scene.',
    zh: '鏡頭沿穩定路徑慢慢側移，像沿軌道滑動。',
    modes: ['cinematic'],
    loopRisk: true,
  },
  {
    id: 'orbit',
    nameZh: '繞主體移動 · 主體留在原位',
    en: 'Move the camera in a slow, gentle arc around the stationary selected subject.',
    zh: '主體保持原位，鏡頭沿緩慢弧線繞行。',
    modes: ['cinematic'],
    loopRisk: true,
  },
];
export const CAMERA_BY_ID = new Map(CAMERAS_DATA.map((c) => [c.id, c]));
