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

This repository contains project documentation, design tokens, and an interactive visual reference. It does not yet contain a production app, connected map, backend, or deployed service.

Open `docs/design/reference.html` in a browser. It needs no install and uses illustrative geography and explicitly simulated events. Its controls demonstrate the shared response; they do not contact anyone or track a real worker.

See the [reviewed desktop capture](docs/design/reference-desktop.png) and [reference verification notes](docs/design/REVIEW.md). To serve the reference locally with Python installed, run `python -m http.server 8767 --bind 127.0.0.1` from the repository and open [the local reference](http://127.0.0.1:8767/docs/design/reference.html). This serves documentation only, not the future application.

The implementation defaults are one Next.js/TypeScript application with `/public` and `/authority` entry points, Supabase for shared persistence and identity, and MapLibre for the map. These are selected project defaults, not installed dependencies. The foundation task pins compatible versions and adds verified setup commands.

## Product rules

- The live map is core prototype scope.
- Agent tracking means authority teams or field workers and work progress. Continuous GPS is outside version 1.
- Multiple authorities have separate assignments on one issue. One lead coordinates final resolution.
- Residents add evidence to the existing thread; related reports are suggested, never silently merged.
- Public status comes from recorded human actions. AI suggestions do not claim work happened.
- Both builders use the same tokens, records, status names, event rules, and demo fixture.
