import type {
  MotionPlan,
  CompiledPrompt,
  Provider,
} from '../models/motion-plan';
import { compileOmni } from './compilers/omni';
import { compileVeo } from './compilers/veo';
import { compileGrok } from './compilers/grok';
import { normalizePlan, switchProvider } from './motion-planner';
const compilers: Record<Provider, (p: MotionPlan) => CompiledPrompt> = {
  omni: compileOmni,
  veo: compileVeo,
  grok: compileGrok,
};
export function compilePrompt(p: MotionPlan): CompiledPrompt {
  const plan = normalizePlan(p);
  return compilers[plan.provider](plan);
}
export function compareProviders(
  p: MotionPlan,
): Record<Provider, CompiledPrompt> {
  return {
    omni: compilePrompt(p.provider === 'omni' ? p : switchProvider(p, 'omni')),
    veo: compilePrompt(p.provider === 'veo' ? p : switchProvider(p, 'veo')),
    grok: compilePrompt(p.provider === 'grok' ? p : switchProvider(p, 'grok')),
  };
}
