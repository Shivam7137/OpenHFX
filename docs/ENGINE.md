# Report engine handoff

The engine supports **Anthropic Messages** using the user-selected `claude-sonnet-4-6` model. Default configuration still uses a clearly labeled deterministic demo with no paid calls. Both modes classify resident text, select eligible fictional organizations, suggest related public reports, and propose editable next steps. Neither dispatches workers, contacts authorities, changes status, or predicts which tree will fall.

## Entry points

- `src/server/engine/index.ts`: `prepareReport(input, context, options)` and typed exports.
- `src/server/engine/validation.ts`: input/output limits, schemas, eligible directory and nearby candidates.
- `src/server/engine/demo.ts`: deterministic demo behavior.
- `src/server/engine/summary.ts`: public-event extractive progress summary with source IDs.
- `src/server/app/reporting.ts`: authenticated persisted preparation jobs and application configuration.
- `tests/engine/engine.test.ts`: behavior and provider-adapter contract tests.

The application reads `OPENHFX_ENGINE_MODE` and explicitly passes the mode. The reusable library reads no environment variables: omitted `options.mode` means `demo`, even when an adapter is supplied. `src/server/app/provider.ts` selects the adapter only for an explicitly named Anthropic provider and nonempty key. `unconfigured`, or `provider` without an adapter, produces `UNCONFIGURED`; the resident can still submit manually.

Local connection requires `LLM_API_KEY`, `LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-sonnet-4-6`, and `OPENHFX_ENGINE_MODE=provider` in ignored `.env.local`. Restart the server after changes. Provider mode sends report text/public context and selected photos with descriptions to Anthropic; never use private personal data in demo reports. The key remains in server-side configuration, never in API metadata or browser variables.

`src/server/engine/providers/anthropic.ts` calls the fixed HTTPS Messages endpoint with `anthropic-version: 2023-06-01`, redirects disabled, abort propagation, bounded response reads, and no SDK-level retries. It uses `output_config.format` JSON schema, removes unsupported length/count grammar constraints while retaining them as descriptions, and leaves final strict validation to the engine. Refusals and incomplete replies fail safely; error response bodies are never exposed. See [Anthropic structured output documentation](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) and [Messages reference](https://platform.claude.com/docs/en/api/messages/create).

## Adding another provider later

Implement the exported `ReportProvider` interface server-side:

```ts
interface ReportProvider {
  id: string;
  model: string;
  generate(request: ProviderRequest, options: { signal: AbortSignal }): Promise<unknown>;
}
```

The request contains separate `instructions`, JSON-encoded untrusted `data`, optional server-derived `images`, `outputSchema`, `maxOutputTokens`, and `promptVersion`. Map these to the selected provider's structured-output API. Return a decoded output object or JSON text; do not return SDK wrappers. Forward the abort signal and normalize failures with `ProviderError('transient' | 'refusal' | 'permanent')`. Do not log report text, image bytes, credentials, or private operational records.

Inject the adapter into `prepareReport(input, context, { mode: 'provider', provider })` in the application runner. Credentials belong only in server environment configuration. Anthropic is wired through this seam; other provider names fail unconfigured until explicitly implemented.

## Guardrails and lifecycle

Only original report text, the public location, fixed categories, eligible organizations, bounded public candidate records, and explicitly selected reporter-owned photos enter the engine. Text, photo captions, and text visible in photos are untrusted data, never instructions. A strict schema rejects extra fields, malformed values, and organization/issue IDs outside supplied eligibility. Related reports remain suggestions, not automatic merges. User-reviewed fields are submitted separately; preparation completion never edits a published report.

### Photo context

The report form includes uploaded `attachmentIds` when preparing suggestions (optional, unique, maximum three). The authenticated server rejects missing or foreign photos before creating a job, even if a foreign photo is publicly viewable. Public JSON cannot supply image URLs or base64. `src/server/app/preparation-images.ts` reads owned image bytes from local storage and creates metadata-free JPEG derivatives in memory, maximum 1280 pixels per edge and 2 MiB per photo; stored evidence stays unchanged.

Provider requests include these image blocks before the JSON text, with numbered descriptions in the untrusted data. Base64 is never persisted in preparation records or returned in their API projection. The report form explains that text, public location, photos, and descriptions go to Anthropic. Demo mode does not send or visually analyze photos. This follows the [Anthropic vision message format](https://platform.claude.com/docs/en/build-with-claude/vision). Visual observations remain uncertain suggestions: the prompt forbids identifying people, transcribing identifying details, or predicting tree failure. This is not an automatic face/plate redaction service.

The engine imposes a 20-second total deadline and at most one retry for a normalized transient error. Cancellation and stale-result checks are available through `signal` and `isCurrent`; adapters ignoring cancellation cannot keep the caller waiting beyond the deadline. Outcomes include mode/provider/model, prompt version, attempts, and latency. There are no autonomous tools or external-contact permissions.

The application persists `queued -> running -> succeeded | failed`, checks preparation ownership, and marks interrupted jobs failed on restart. It uses a detached in-process job suitable for one persistent local server, not a serverless durable queue. A hosted deployment needs durable job execution and real identity/storage adapters.

Progress summaries require no model. They exclude staff events, reject mixed issue IDs, retain source event IDs, prioritize recent updates within the character budget, and display retained excerpts chronologically. They describe recorded public actions rather than inferred work.

## Checks

`npm test -- tests/engine/anthropic.test.ts tests/backend/preparation-images.test.ts` exercises the adapter and authorized image path with a fake network transport and no real credentials or charges. For an explicitly paid end-to-end preparation, start the app in configured provider mode and run `node scripts/verify-provider.mjs --live --with-image`. It uploads a synthetic illustration, submits one fictional report preparation, and prints safe status/model metadata only; the engine may retry once for a transient failure. It does not publish a new issue. Omit `--with-image` for text-only. An account spending cap is enforced by Anthropic, not by this prototype.

Run `npm test -- tests/engine/engine.test.ts`. Run the full backend suite and `npm run smoke` when changing the application adapter; a valid standalone suggestion does not prove that sessions, persistence, or authority permissions work.
