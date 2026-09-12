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

This repository contains project documentation, design tokens, an interactive visual reference, and the first slice of the application: the public nearby map at `/public` (screen P01).

The map is MapLibre GL JS drawing a configured open basemap, with demo issues as markers whose fill carries lifecycle, interior glyph carries category, and ring carries selection. It clusters, filters by category, offers a list alternative, an explicit Locate action, a visible legend and provider attribution, a "Search this area" prompt after panning, and a list fallback when no basemap is available.

It reads a bundled demo fixture rather than a database. There is no backend, live subscription, reporting flow, authority experience, or deployed service yet, and the interface says so on screen. See [DELIVERY](docs/DELIVERY.md) for what each remaining package covers.

### Run the application

Verified with Node 22.22.2 and npm 10.9.7.

```bash
npm install
cp .env.example .env.local   # then choose a basemap provider, see below
npm run dev                  # http://localhost:3000/public
```

`npm run build`, `npm run start`, `npm run typecheck`, and `npm run lint` all pass. `dev` and `build` first regenerate `src/styles/tokens.css` from the canonical tokens and stage MapLibre's worker into `public/maplibre/`; both are generated and are not committed.

### Choosing a basemap

MapLibre renders a map but supplies no tiles. `NEXT_PUBLIC_MAP_STYLE_URL` defaults to [OpenFreeMap](https://openfreemap.org), an OpenStreetMap-derived open provider that needs no API key. Point it at your own style or self-hosted tiles before treating the map as a production service, and keep `NEXT_PUBLIC_MAP_ATTRIBUTION` accurate for whatever you use.

`public/styles/offline-basemap.json` is a development and testing style with no tile sources. It draws no geography at all, only a plain ground under the markers, and must never be shown as the map.

### Visual reference

Open `docs/design/reference.html` in a browser. It needs no install and uses illustrative geography and explicitly simulated events. Its controls demonstrate the shared response; they do not contact anyone or track a real worker.

See the [reviewed desktop capture](docs/design/reference-desktop.png) and [reference verification notes](docs/design/REVIEW.md). To serve the reference locally with Python installed, run `python -m http.server 8767 --bind 127.0.0.1` from the repository and open [the local reference](http://127.0.0.1:8767/docs/design/reference.html). This serves documentation only, not the future application.

The implementation defaults are one Next.js/TypeScript application with `/public` and `/authority` entry points, Supabase for shared persistence and identity, and MapLibre for the map. Next.js, TypeScript, and MapLibre are now installed and pinned in one lockfile; Supabase, the API handlers, and the `/authority` entry point are still planned.

## Product rules

- The live map is core prototype scope.
- Agent tracking means authority teams or field workers and work progress. Continuous GPS is outside version 1.
- Multiple authorities have separate assignments on one issue. One lead coordinates final resolution.
- Residents add evidence to the existing thread; related reports are suggested, never silently merged.
- Public status comes from recorded human actions. AI suggestions do not claim work happened.
- Both builders use the same tokens, records, status names, event rules, and demo fixture.
