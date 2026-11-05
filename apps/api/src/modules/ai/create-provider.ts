import type { Env } from '../../config/env.ts';
import { AnthropicProvider } from './anthropic.provider.ts';
import { SimulatedProvider } from './simulated.provider.ts';
import type { AiProvider } from './types.ts';

/** Picks the AI provider from the environment. With no key, AI features are simply off. */
export function createAiProvider(env: Env): AiProvider | null {
  switch (env.AI_PROVIDER) {
    case 'off':
      return null;
    case 'simulated':
      return new SimulatedProvider();
    case 'anthropic':
    case 'auto':
      return env.ANTHROPIC_API_KEY ? new AnthropicProvider(env.ANTHROPIC_API_KEY) : null;
  }
}
