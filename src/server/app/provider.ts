import { createAnthropicProvider } from '@/server/engine/providers/anthropic';

/** Called only for provider-mode jobs, never from the client or demo mode. */
export function configuredProvider() {
  if (process.env.LLM_PROVIDER?.trim().toLowerCase() !== 'anthropic' || !process.env.LLM_API_KEY?.trim()) return undefined;
  return createAnthropicProvider(process.env.LLM_API_KEY, process.env.LLM_MODEL?.trim() || 'claude-sonnet-4-6');
}
