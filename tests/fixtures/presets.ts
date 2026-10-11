import { defaultPlan } from '../../src/engine/motion-planner';
import type { MotionPreset } from '../../src/models/motion-plan';

// Valid large batches exercise aggregate limits without committing large JSON fixtures.
export function largePresetBatch(prefix: string, count = 30): MotionPreset[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    nameEn: 'Large preset',
    nameZh: '大型預設',
    descriptionZh: 'd'.repeat(500),
    category: 'custom',
    mode: 'ambient',
    plan: defaultPlan(),
    providerNotesZh: Array.from(
      { length: 20 },
      (_, j) => String(j).padStart(2, '0') + 'n'.repeat(498),
    ),
    warningsZh: Array.from(
      { length: 20 },
      (_, j) => String(j).padStart(2, '0') + 'w'.repeat(498),
    ),
    updatedAt: '2026-10-11T09:00:00.000Z',
  }));
}
