import { compilePrompt } from '../engine/compile';
import { COMPILER_VERSION } from '../engine/compilers/common';
import { VERIFIED_AT } from '../models/provider-capabilities';
import { compilePrompt as compileV1 } from './legacy-v1/engine/compile';
import { compilePrompt as compileV11 } from './legacy-v1.1/engine/compile';

// Exact allowlisted pairs only. Future compiler/capability updates must retain
// their old verifier here, with an immutable source snapshot and fixtures.
// Never accept a version range or verify an old prompt using today's compiler.
export const EXPORT_PROFILES = [
  {
    compilerVersion: '1.0.0',
    capabilitySnapshotDate: '2026-10-11',
    compile: compileV1,
  },
  {
    compilerVersion: '1.1.0',
    capabilitySnapshotDate: '2026-10-11',
    compile: compileV11,
  },
  {
    compilerVersion: COMPILER_VERSION,
    capabilitySnapshotDate: VERIFIED_AT,
    compile: compilePrompt,
  },
] as const;
