import type { MotionPlan } from '../models/motion-plan';

// A deliberately small, deterministic instruction check, not general language
// understanding. Only affirmative camera directives can be blocking errors.
function negated(prefix: string): boolean {
  return /\b(?:no|not|never|without|avoid|don't|do not|rather than|instead of)\b/i.test(
    prefix.replace(/\bnot only\b/gi, ''),
  );
}
export function cameraNotesConflict(notes: string, camera: MotionPlan['camera']): boolean {
  const clauses = notes.toLowerCase().split(
    /[.,;!?]|\b(?:but|however)\b|\b(?:and|or)\s+(?=(?:use|make|move|perform|execute|keep)\b)/,
  );
  for (const clause of clauses) {
    if (camera !== 'locked') {
      const fixed = /\b(?:locked|static|fixed)\s+(?:camera|shot)\b|\b(?:camera|shot)\s+(?:(?:is|stays|remains|should be|must be)\s+)?(?:locked|static|fixed)\b/g;
      for (const match of clause.matchAll(fixed))
        if (!negated(clause.slice(0, match.index))) return true;
    } else {
      const moves = /\b(?:pan(?:s|ning)?|push[ -]?in|orbit(?:s|ing)?|dolly|pull[ -]?out)\b/g;
      for (const match of clause.matchAll(moves)) {
        const prefix = clause.slice(0, match.index);
        if (negated(prefix)) continue;
        // A frying pan (or pan as a scene object) is not a camera instruction.
        if (match[0].startsWith('pan') && /\b(?:frying|cooking|baking|sauce)\s*$/.test(prefix)) continue;
        if (match[0] === 'pan' && /\b(?:a|the|this|that)\s+$/.test(prefix) &&
            /^\s+(?:on|in|beside|sits|rests|lies)\b/.test(clause.slice(match.index + match[0].length))) continue;
        const explicit = /\b(?:camera|shot)\b/.test(clause) ||
          /^(?:(?:please|slowly|gently|smoothly|gradually|slightly|very)\s+)*$/.test(prefix.trimStart()) ||
          /\b(?:use|make|perform|execute|add|include)\b/.test(prefix);
        if (explicit) return true;
      }
    }
  }
  return false;
}
