import type { MotionPlan } from '../models/motion-plan';

export function motionSignature(p: MotionPlan): string {
  return JSON.stringify({
    mode: p.mode, subjectMotions: p.subjectMotions,
    environmentalMotions: p.environmentalMotions, primaryMotion: p.primaryMotion,
    intensity: p.intensity, motionTiming: p.motionTiming, camera: p.camera, loop: p.loop,
    rotation: p.rotation, durationSeconds: p.durationSeconds,
    preservation: p.preservation, audio: p.audio,
  });
}

// Cancelling a motion preset is not an Undo of all subsequent user edits.
// Application never owns provider/model/source; retain their current values.
// Density returns to the prior value only if it still equals the applied one.
export function restorePresetPlan(
  current: MotionPlan, before: MotionPlan, applied: MotionPlan,
): MotionPlan {
  return {
    ...structuredClone(before),
    provider: current.provider,
    model: current.model,
    source: structuredClone(current.source),
    length: current.length === applied.length ? before.length : current.length,
  };
}
