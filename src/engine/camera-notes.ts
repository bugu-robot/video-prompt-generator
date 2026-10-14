import type { MotionPlan } from '../models/motion-plan';

// A deliberately small, deterministic instruction check, not general language
// understanding. Only affirmative camera directives can be blocking errors.
function negated(prefix: string): boolean {
  return /\b(?:no|not|never|without|avoid|don't|do not|rather than|instead of)\b/i.test(
    prefix.replace(/\bnot only\b/gi, ''),
  );
}
const modifiers = '(?:(?:please|slowly|slow|gently|gentle|smoothly|smooth|gradually|slightly|subtle|very)\\s+)*';
const barePrefix = new RegExp('^' + modifiers + '$');
const directivePrefix = new RegExp('\\b(?:use|make|perform|execute|add|include|apply|create)\\s+(?:(?:a|an|the)\\s+)?' + modifiers + '$');
const cameraPrefix = new RegExp('\\b(?:camera|shot)\\s+(?:(?:should|must|will|can|is|are)\\s+)?' + modifiers + '$');
const listPrefix = new RegExp('^\\s*' + modifiers + '(?:pan|tilt|parallax|zoom|dolly|orbit|roll|truck|track|pedestal|crane|handheld)\\b');
const movement = /\b(?:pan(?:s|ning)?|tilt(?:s|ing)?|parallax|zoom(?:s|ing)?(?:[ -]+(?:in|out))?|push[ -]?in|orbit(?:s|ing)?|dolly|pull[ -]?out|roll(?:s|ing)?|truck(?:s|ing)?|track(?:s|ing)?|pedestal|crane|handheld|slide(?:s|ing)?|arc(?:s|ing)?|move(?:s|ment|ing)?)\b/g;

export function cameraNotesConflict(notes: string, camera: MotionPlan['camera']): boolean {
  const clauses = notes.toLowerCase().split(
    /[.;!?]|\b(?:but|however)\b|\band\s+(?=(?:use|make|move|perform|execute|keep|add|include|apply|create)\b)/,
  );
  for (const clause of clauses) {
    let negatedList = false;
    for (const part of clause.split(',')) {
      if (camera !== 'locked') {
        const fixed = /\b(?:locked|static|fixed)\s+(?:camera|shot)\b|\b(?:camera|shot)\s+(?:(?:is|stays|remains|should be|must be)\s+)?(?:locked|static|fixed)\b/g;
        for (const match of part.matchAll(fixed))
          if (!negated(part.slice(0, match.index))) return true;
      } else {
        for (const match of part.matchAll(movement)) {
          const prefix = part.slice(0, match.index);
          const suffix = part.slice(match.index + match[0].length);
          const inherited = negatedList && barePrefix.test(prefix.trim()) && !/\binstead\b/.test(suffix);
          if (negated(prefix) || inherited) continue;
          // Scene objects and subject movement are not camera directives.
          if (match[0].startsWith('pan') && /\b(?:frying|cooking|baking|sauce)\s*$/.test(prefix)) continue;
          if (match[0] === 'pan' && /\b(?:a|the|this|that)\s+$/.test(prefix) &&
              /^\s+(?:on|in|beside|sits|rests|lies)\b/.test(suffix)) continue;
          if (/^\s+(?:(?:a|the|its|their|your)\s+)?(?:head|body|tail|ears?|leaves|lens|lenses|toy|truck|track)\b/.test(suffix)) continue;
          const cameraContext = cameraPrefix.test(prefix) ||
            /^\s+(?:(?:a|the)\s+)?(?:camera|shot)\b/.test(suffix);
          if (!cameraContext && /^(?:tilt|roll|slide)/.test(match[0]) &&
              /^\s+(?:a|the|its|their|your)\s+/.test(suffix)) continue;
          if (!cameraContext && /^(?:crane|truck|dolly|pedestal)$/.test(match[0]) &&
              !/^\s+(?:up(?:ward)?|down(?:ward)?|left|right|forward|back(?:ward)?|sideways|movement|move|shot)\b/.test(suffix) &&
              suffix.trim() !== '') continue;
          const explicit = cameraContext ||
            (!match[0].startsWith('move') && (barePrefix.test(prefix.trim()) || directivePrefix.test(prefix)));
          if (explicit) return true;
        }
      }
      // Carry negation through a comma-separated bare movement list only.
      // A new explicit directive (e.g. "use a zoom") owns its own scope.
      negatedList = negated(part) || (negatedList &&
        listPrefix.test(part));
    }
  }
  return false;
}
