import { ProviderError, type ProviderRequest, type ReportProvider } from '../types';

// Anthropic does not support these length/count constraints in its grammar.
// Retain them as instructions; the engine validates the original strict schema.
const constraints = new Set(['minLength', 'maxLength', 'minItems', 'maxItems', 'uniqueItems', 'minimum', 'maximum', 'multipleOf']);
function providerSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(providerSchema);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  const notes: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    if (key === '$schema') continue;
    if (constraints.has(key)) notes.push(`${key}: ${JSON.stringify(child)}`);
    else result[key] = providerSchema(child);
  }
  if (notes.length) result.description = [result.description, `Required limits: ${notes.join('; ')}.`].filter(Boolean).join(' ');
  return result;
}

async function responseEnvelope(response: Response): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderError('permanent');
  let size = 0;
  const parts: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65_536) { await reader.cancel(); throw new ProviderError('permanent'); }
      parts.push(value);
    }
    const body: unknown = JSON.parse(Buffer.concat(parts).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ProviderError('permanent');
    return body as Record<string, unknown>;
  } catch { throw new ProviderError('permanent'); }
  finally { reader.releaseLock(); }
}

/** Server-only use. The key is held in a closure, never returned in metadata. */
export function createAnthropicProvider(apiKey: string, model: string, transport: typeof fetch = fetch): ReportProvider {
  if (!apiKey.trim() || /[\r\n]/.test(apiKey) || !model.trim()) throw new ProviderError('permanent');
  return {
    id: 'anthropic', model,
    async generate(request: ProviderRequest, { signal }) {
      let response: Response;
      try {
        response = await transport('https://api.anthropic.com/v1/messages', {
          method: 'POST', redirect: 'error', signal,
          headers: { 'x-api-key': apiKey.trim(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({
            model, max_tokens: request.maxOutputTokens, stream: false,
            system: request.instructions,
            messages: [{ role: 'user', content: request.images?.length ? [
              ...request.images.map(image => ({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } })),
              { type: 'text', text: request.data },
            ] : request.data }],
            output_config: { format: { type: 'json_schema', schema: providerSchema(request.outputSchema) } },
          }),
        });
      } catch { throw new ProviderError('transient'); }
      if (!response.ok) {
        // Provider bodies may echo inputs; do not expose or log them.
        await response.body?.cancel();
        throw new ProviderError(response.status === 408 || response.status === 429 || response.status >= 500 ? 'transient' : 'permanent');
      }
      const body = await responseEnvelope(response);
      if (body.stop_reason === 'refusal') throw new ProviderError('refusal');
      if (body.stop_reason !== 'end_turn' || !Array.isArray(body.content)) throw new ProviderError('permanent');
      const blocks = body.content.filter((block): block is { type: 'text'; text: string } => Boolean(block) && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string');
      if (blocks.length !== 1) throw new ProviderError('permanent');
      return blocks[0].text;
    },
  };
}
