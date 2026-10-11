export const PROVIDERS = ['omni', 'veo', 'grok'] as const;
export type Provider = (typeof PROVIDERS)[number];
export const MODES = ['ambient', 'rotation', 'cinematic'] as const;
export type GenerationMode = (typeof MODES)[number];
export const INTENSITIES = ['minimal', 'subtle', 'moderate'] as const;
export type Intensity = (typeof INTENSITIES)[number];
export const CAMERAS = [
  'locked',
  'push-in',
  'pull-out',
  'pan',
  'tilt',
  'parallax',
  'dolly',
  'orbit',
] as const;
export type CameraMovement = (typeof CAMERAS)[number];
export const LOOP_STRATEGIES = [
  'match-pose',
  'continuous',
  'crossfade',
  'none',
] as const;
export type LoopStrategy = (typeof LOOP_STRATEGIES)[number];
export const PRESERVATIONS = [
  'identity',
  'face',
  'proportions',
  'objects',
  'composition',
  'lighting',
  'palette',
  'background',
  'style',
] as const;
export type Preservation = (typeof PRESERVATIONS)[number];
export const SUBJECT_TYPES = [
  'unspecified',
  'character',
  'cat',
  'coffee-cup',
  'window',
  'tree',
  'product',
  'custom',
] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];
export const MODEL_IDS = [
  'omni-flash-1.1',
  'veo-3.1-fast',
  'veo-3.1-lite',
  'veo-3.1-quality',
  'grok-consumer-current',
] as const;
export type ModelId = (typeof MODEL_IDS)[number];
export type PromptLength = 'concise' | 'balanced' | 'detailed';
export type PromptView = 'en' | 'zh' | 'both';
export type AudioPreference = 'none-requested' | 'ambient' | 'provider-default';
export type VariationId = 'A' | 'B' | 'C';
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SourceImageMetadata {
  name: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
}
export interface SourceContext {
  subjectType: SubjectType;
  subjectEn: string;
  subjectZh: string;
  sceneNotesEn: string;
  sceneNotesZh: string;
  elementsConfirmed: boolean;
  image: SourceImageMetadata | null;
  region: Region | null;
}
export interface RotationConfiguration {
  type: 'turntable' | 'orbit';
  angle: 90 | 180 | 360;
  direction: 'clockwise' | 'counterclockwise';
  speed: 'uniform' | 'slow' | 'ease';
  axis: 'y' | 'x' | 'z';
  centered: boolean;
  stableFraming: boolean;
  consistentScale: boolean;
  stableLighting: boolean;
  geometry: boolean;
  details: boolean;
  returnToStart: boolean;
  inputMode: 'single' | 'references' | '3d';
}
export interface MotionPlan {
  schemaVersion: '1.0.0';
  provider: Provider;
  model: ModelId;
  mode: GenerationMode;
  durationSeconds: number | null;
  source: SourceContext;
  subjectMotions: string[];
  environmentalMotions: string[];
  primaryMotion: string | null;
  intensity: Intensity;
  motionTiming: 'sparse' | 'natural' | 'sustained';
  camera: CameraMovement;
  loop: LoopStrategy;
  preservation: Preservation[];
  rotation: RotationConfiguration;
  audio: AudioPreference;
  length: PromptLength;
  presetId: string | null;
}
export interface AuditFinding {
  id: string;
  severity: 'error' | 'warning' | 'recommendation';
  messageZh: string;
  messageEn: string;
}
export interface PromptSection {
  id: string;
  titleEn: string;
  titleZh: string;
  en: string;
  zh: string;
}
export interface CompiledPrompt {
  compilerVersion: string;
  plan: MotionPlan;
  sections: PromptSection[];
  english: string;
  chinese: string;
  findings: AuditFinding[];
  workflowZh: string[];
}
export interface MotionPreset {
  id: string;
  nameEn: string;
  nameZh: string;
  descriptionZh: string;
  category:
    'cafe' | 'character' | 'nature' | 'rotation' | 'cinematic' | 'custom';
  mode: GenerationMode;
  plan: MotionPlan;
  providerNotesZh: string[];
  warningsZh: string[];
  updatedAt?: string;
}
export interface AppSettings {
  plan: MotionPlan;
  view: PromptView;
  theme: 'dark' | 'light' | 'system';
}
