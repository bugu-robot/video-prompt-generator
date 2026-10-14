import type { MotionPlan } from '../models/motion-plan';

export function motionSignature(p: MotionPlan): string {
  return JSON.stringify({
    mode: p.mode, subjectMotions: p.subjectMotions,
    environmentalMotions: p.environmentalMotions, primaryMotion: p.primaryMotion,
    intensity: p.intensity, motionTiming: p.motionTiming, camera: p.camera, loop: p.loop,
    rotation: p.rotation,
  });
}

// Full signature retains the custom preset dirty indicator for peripheral edits.
export function presetSignature(p: MotionPlan): string {
  return JSON.stringify([motionSignature(p), p.durationSeconds, p.preservation, p.audio, p.length]);
}

// Cancelling a motion preset is not an Undo of all subsequent user edits.
// Application never owns provider/model/source; retain their current values.
// Peripheral fields restore only if still equal to their applied values.
export function restorePresetPlan(
  current: MotionPlan, before: MotionPlan, applied: MotionPlan,
): MotionPlan {
  return {
    ...structuredClone(before),
    provider: current.provider,
    model: current.model,
    source: structuredClone(current.source),
    length: current.length === applied.length ? before.length : current.length,
    durationSeconds: current.durationSeconds === applied.durationSeconds ? before.durationSeconds : current.durationSeconds,
    audio: current.audio === applied.audio ? before.audio : current.audio,
    preservation: structuredClone(
      JSON.stringify(current.preservation) === JSON.stringify(applied.preservation)
        ? before.preservation : current.preservation,
    ),
  };
}
