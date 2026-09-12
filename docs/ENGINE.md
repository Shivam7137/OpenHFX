# Report engine handoff

The provider is intentionally **not selected or connected**. The runnable default is a clearly labeled deterministic demo. It classifies the resident's text, selects eligible fictional organizations, suggests related public reports, and proposes editable next steps. It never dispatches workers, contacts an authority, changes status, or predicts which tree will fall.

## Entry points

- `src/server/engine/index.ts`: `prepareReport(input, context, options)` and typed exports.
- `src/server/engine/validation.ts`: input/output limits, schemas, eligible directory and nearby candidates.
- `src/server/engine/demo.ts`: deterministic demo behavior.
- `src/server/engine/summary.ts`: public-event extractive progress summary with source IDs.
- `src/server/app/reporting.ts`: authenticated persisted preparation jobs and application configuration.
- `tests/engine/engine.test.ts`: behavior and provider-adapter contract tests.

The application reads `OPENHFX_ENGINE_MODE` and explicitly passes the mode. The reusable library reads no environment variables: omitted `options.mode` means `demo`, even when an adapter is supplied. `unconfigured`, or `provider` without an adapter, produces `UNCONFIGURED`; the resident can still submit manually. `LLM_PROVIDER` and `LLM_MODEL` remain empty reserved configuration, not an automatic connection.

## Connecting a provider later

Implement the exported `ReportProvider` interface server-side:

```ts
interface ReportProvider {
  id: string;
  model: string;
  generate(request: ProviderRequest, options: { signal: AbortSignal }): Promise<unknown>;
}
```

The request contains separate `instructions`, JSON-encoded untrusted `data`, `outputSchema`, `maxOutputTokens`, and `promptVersion`. Map these to the selected provider's structured-output API. Return the decoded output object; do not return SDK wrappers. Forward the abort signal and normalize failures with `ProviderError('transient' | 'refusal' | 'permanent')`. Do not log report text, credentials, or private operational records.

Inject the adapter into `prepareReport(input, context, { mode: 'provider', provider })` in the application runner. Credentials belong only in server environment configuration. Implement this explicitly after the team chooses a provider; setting the reserved environment names alone does nothing today.

## Guardrails and lifecycle

Only original report text, the public location, fixed categories, eligible organizations, and bounded public candidate records enter the engine. Text is untrusted data, never instructions. A strict schema rejects extra fields, malformed values, and organization/issue IDs outside supplied eligibility. Related reports remain suggestions, not automatic merges. User-reviewed fields are submitted separately; preparation completion never edits a published report.

The engine imposes a 20-second total deadline and at most one retry for a normalized transient error. Cancellation and stale-result checks are available through `signal` and `isCurrent`; adapters ignoring cancellation cannot keep the caller waiting beyond the deadline. Outcomes include mode/provider/model, prompt version, attempts, and latency. There are no autonomous tools or external-contact permissions.

The application persists `queued -> running -> succeeded | failed`, checks preparation ownership, and marks interrupted jobs failed on restart. It uses a detached in-process job suitable for one persistent local server, not a serverless durable queue. A hosted deployment needs durable job execution and real identity/storage adapters.

Progress summaries require no model. They exclude staff events, reject mixed issue IDs, retain source event IDs, prioritize recent updates within the character budget, and display retained excerpts chronologically. They describe recorded public actions rather than inferred work.

## Checks

Run `npm test -- tests/engine/engine.test.ts`. Run the full backend suite and `npm run smoke` when changing the application adapter; a valid standalone suggestion does not prove that sessions, persistence, or authority permissions work.
