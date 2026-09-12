# OpenHFX

Report a local problem. Bring the right people together. Follow the response.

Two mobile web experiences share one issue record: residents report and contribute evidence; authorities coordinate organizations and field teams. A live map connects activity to a place. An LLM helps prepare and route reports.

## Start here

Read these before starting a task. They are the team's shared baseline, version 1.0, dated 2026-09-12.

| Document | Answers |
| --- | --- |
| [Product brief](docs/PRODUCT.md) | What are we building, for whom, and what is in scope? |
| [Design specification](docs/DESIGN_SPEC.md) | Exactly how should the screens look and behave? |
| [Visual reference](docs/design/reference.html) | What does that direction look like across four mobile screens? |
| [System contracts](docs/SYSTEM_CONTRACTS.md) | What records, permissions, APIs, events, and LLM outputs do both apps share? |
| [Team agreement](docs/TEAM.md) | Who owns what, how do we integrate, and how do decisions change? |
| [Delivery and demo](docs/DELIVERY.md) | What do we build first, how do we test it, and what do we show judges? |

AI coding assistants must also read [AGENTS.md](AGENTS.md). The [early brainstorming document](docs/superpowers/specs/2026-09-12-openhfx-design.md) is retained as history, not a competing specification.

## Current deliverables

The `feat/llm-engine` branch contains a runnable local prototype: both mobile apps, persistent reports/evidence, multi-authority assignments, field-team milestones, notifications, and a provider-neutral preparation engine with an optional Anthropic adapter. The real map remains a teammate integration. This is not a production deployment or municipal service.

### Run the app

Requires Node 24 (verified with 24.11.0) and npm (11.6.1). From the repository:

```sh
npm ci
npm run dev
```

Open [the public app](http://127.0.0.1:3000/public) or [the authority app](http://127.0.0.1:3000/authority). The clearly labeled demo sign-in offers fictional residents, coordinators, and field workers; no password or API key is needed. Sessions and application records persist in ignored `.data/openhfx.sqlite`. Use a separate browser profile for a second simultaneous identity.

`npm test` runs engine/backend tests; `npm run typecheck` checks types; `npm run build` builds the app. With the app running, `npm run smoke` exercises six independent authenticated sessions through report creation, two organizations, worker progress, evidence, notifications, and guarded resolution. Smoke reports remain in the local database and are labeled.

The default engine uses labeled deterministic demo suggestions. For real suggestions, set `LLM_API_KEY`, `LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-sonnet-4-6`, and `OPENHFX_ENGINE_MODE=provider` in ignored `.env.local`, then restart. Set the mode to `demo` for no-cost examples or `unconfigured` for manual reporting. Provider mode sends report text, public location context, and up to three uploaded photos with descriptions to Anthropic and incurs usage charges. Images are ownership-checked and resized server-side. Never put credentials in browser variables or commit them.

Read [implementation/API boundaries](docs/IMPLEMENTATION.md), [engine integration](docs/ENGINE.md), and [map handoff](docs/MAP_INTEGRATION.md) before changing shared interfaces. Live persisted data refreshes by polling; the map illustration is explicitly a placeholder, not a connected basemap. Local SQLite and loopback-only demo identity are prototype adapters; hosted authentication, database policies, deployment, and real dispatch remain separate work.

### Design reference

Open `docs/design/reference.html` in a browser. It needs no install and uses illustrative geography and explicitly simulated events. Its controls demonstrate the shared response; they do not contact anyone or track a real worker.

See the [reviewed desktop capture](docs/design/reference-desktop.png) and [reference verification notes](docs/design/REVIEW.md). To serve only the reference safely, run `python -m http.server 8767 --bind 127.0.0.1 --directory docs/design` and open [the local reference](http://127.0.0.1:8767/reference.html). Never serve the repository root with a generic file server: it contains your private `.env.local`.

The longer-term architecture retains Supabase for hosted persistence/identity and MapLibre for the map. Neither is connected by this branch. The installed stack and exact versions are in `package.json` and its lockfile.

## Product rules

- The live map is core prototype scope.
- Agent tracking means authority teams or field workers and work progress. Continuous GPS is outside version 1.
- Multiple authorities have separate assignments on one issue. One lead coordinates final resolution.
- Residents add evidence to the existing thread; related reports are suggested, never silently merged.
- Public status comes from recorded human actions. AI suggestions do not claim work happened.
- Both builders use the same tokens, records, status names, event rules, and demo fixture.
