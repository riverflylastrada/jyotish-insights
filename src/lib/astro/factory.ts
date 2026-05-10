import type { AstroProvider } from './types';
import { MockProvider } from './providers/mock';
import { VedicRishiProvider } from './providers/vedicrishi';
import { CustomEngineProvider } from './providers/custom';

let cached: AstroProvider | null = null;

export function getAstroProvider(): AstroProvider {
  if (cached) return cached;
  const which = (import.meta.env.VITE_ASTRO_PROVIDER as string | undefined) ?? 'mock';
  switch (which) {
    case 'vedicrishi': cached = new VedicRishiProvider(); break;
    case 'custom':     cached = new CustomEngineProvider(); break;
    case 'mock':
    default:           cached = new MockProvider();
  }
  return cached;
}
