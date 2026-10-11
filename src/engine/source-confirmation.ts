import type { MotionPlan } from '../models/motion-plan';

// Confirmation refers to this source and this semantic selection, not to a
// provider, output density, camera setting or UI language.
function basis(p: MotionPlan): string {
  return JSON.stringify({
    subjectType: p.source.subjectType,
    subjectEn: p.source.subjectEn,
    subjectZh: p.source.subjectZh,
    sceneNotesEn: p.source.sceneNotesEn,
    sceneNotesZh: p.source.sceneNotesZh,
    image: p.source.image,
    region: p.source.region,
    subjectMotions: [...p.subjectMotions].sort(),
    environmentalMotions: [...p.environmentalMotions].sort(),
  });
}
export function invalidateSourceConfirmation(
  previous: MotionPlan,
  next: MotionPlan,
): MotionPlan {
  if (basis(previous) !== basis(next)) next.source.elementsConfirmed = false;
  return next;
}
