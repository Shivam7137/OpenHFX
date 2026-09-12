# Team agreement

Baseline: 1.0 | 2026-09-12

## Source of truth

Start at [README](../README.md). [PRODUCT](PRODUCT.md) owns meaning/scope; [DESIGN_SPEC](DESIGN_SPEC.md) owns appearance/interactions; [SYSTEM_CONTRACTS](SYSTEM_CONTRACTS.md) owns shared names/behavior; [DELIVERY](DELIVERY.md) owns acceptance evidence.

The visual reference illustrates the design. It cannot override contracts or permissions. Fix the illustration if they differ. The initial brainstorming file is historical only.

## Four-person ownership

Assign people to these roles before implementation.

| Role | Owns | Review partner |
| --- | --- | --- |
| Builder A, public/design | Public app, reporting, evidence, following, map presentation, shared UI/tokens | B for integration; quality for UI |
| Builder B, authority/system | Authority app, identity/database/APIs, realtime, engine, assignments/teams | A for contracts; product for routing |
| Product/demo lead | Scope, organization directory, fixtures, decisions, demo narrative | Both builders |
| Quality/integration lead | Mobile checks, acceptance evidence, rehearsal, integration coordination | Both builders |

Backend work is larger. A takes notification UI and map presentation; B owns subscriptions and permissions. Complete a small shared foundation before splitting feature work.

## Planned path ownership

| Paths | Owner | Rule |
| --- | --- | --- |
| `src/app/public/`, `src/features/reporting/`, `src/features/following/` | A | Shared contracts only |
| `src/app/authority/`, `src/features/coordination/`, `src/features/teams/` | B | Shared contracts only |
| `src/components/`, `src/features/map/`, `src/styles/` | A | B reviews authority impact |
| `src/server/`, `src/app/api/`, `supabase/` | B | A reviews public response changes |
| `src/contracts/`, `src/data/demo/`, root manifests/lockfile | One owner per change | Both builders review before dependent work |
| `docs/`, `docs/design/` | Product/quality with A | Update canonical files |

These are planned paths; the app is not scaffolded yet.

## Work card example

```text
Outcome: A resident adds a photo to an existing issue.
Owner: Builder A
Reads: DESIGN_SPEC P03; SYSTEM_CONTRACTS contributions/attachments
Owned paths: src/features/reporting/contributions/, relevant route
Depends on: authenticated contribution endpoint and attachment contract
Acceptance: evidence appears once after refresh and in a second session
Review: Builder B for permissions; quality lead for phone interaction
Out of scope: editing another resident's evidence; video
```

## Integration rhythm

1. Agree on foundation, shared types, and fixture payloads before parallel feature work.
2. Use short feature branches such as `feat/public-report` and `feat/authority-teams`.
3. Coordinate migrations and dependency changes; one person regenerates the lockfile at a time.
4. Integrate complete vertical features early; do not connect the two experiences for the first time at the demo deadline.
5. Review changes to enums, endpoints, event fields, permissions, and tokens with the consuming builder.
6. At each checkpoint, run one issue across both sessions and record the result in DELIVERY.
7. Freeze features before the final rehearsal window; fix the canonical journey and missing states.

The integration target is the remote default branch, `main`. Do not independently rename it or rewrite teammates' commits.

## Ready and done

A ready task has an outcome, owning paths, consumed/produced contracts, dependencies, and an acceptance case. A screen includes loading, empty, failure, success, and permission behavior.

A done task works with persistent data (unless explicitly design-only), follows canonical tokens/names, passes meaningful checks, has been inspected on a phone viewport, enforces backend permissions, and records limitations. Cross-session features must be checked in two sessions. Update docs in the same change; preserve unrelated edits.

## Change decisions

Record decision, reason, affected docs/contracts, owner, and migration impact. Both builders acknowledge cross-cutting changes before merging dependent work. Product reviews wording/scope; A and quality review visuals. Routine fixes inside the existing contract do not require another approval ceremony.

| ID | Baseline decision | Consequence |
| --- | --- | --- |
| D01 | Two mobile entry points, one codebase | Shared identity/data/components |
| D02 | Live map is core | Connected demo must include it |
| D03 | Tracking is team progress, without continuous GPS | Milestones, not movement trails |
| D04 | One lead, multiple assignments | Independent work and guarded resolution |
| D05 | Separate public/staff events | No private fields in public realtime |
| D06 | LLM assists; humans confirm actions | AI cannot directly change lifecycle |
| D07 | Next.js, TypeScript, Supabase, MapLibre | Foundation pins versions; no competing stack |
| D08 | Fictional demo organizations/cases | Visible labeling; no official claims |
| D09 | Map-first public; work-first authority | Common tokens, different hierarchy |
| D10 | Current delivery is docs and visual reference | Production implementation follows separately |
| D11 | Basemap provider is configuration, defaulting to OpenFreeMap | No API key or paid account is required to run the map; swapping provider is an environment change, and attribution follows the provider |

## Teammate handoff

“Read README, PRODUCT, DESIGN_SPEC, SYSTEM_CONTRACTS, TEAM, and your DELIVERY package before coding. Use shared tokens and fixtures. Claim paths, keep contracts compatible, and show your feature across public and authority sessions. Record limitations and label simulated behavior.”
