# Delivery, verification, and demo

Baseline: 1.0 | 2026-09-12 | Owner: quality/integration lead

This is a dependency-ordered delivery backlog, not a claim of implemented features. Each package is a small integration checkpoint. Follow [TEAM](TEAM.md), [DESIGN_SPEC](DESIGN_SPEC.md), and [SYSTEM_CONTRACTS](SYSTEM_CONTRACTS.md).

Current progress is recorded separately in [application verification](VERIFICATION.md). The original backlog below remains the full product target. MapLibre and the optional Anthropic adapter are now connected; hosted-auth and subscriptions remain future work. The current prototype uses three-second snapshot polling, local SQLite, and fictional loopback demo accounts; exact setup and integration boundaries are in [IMPLEMENTATION](IMPLEMENTATION.md) and [MAP_INTEGRATION](MAP_INTEGRATION.md).

## Build order

| Package | Owner | Depends on | Deliverable and review gate |
| --- | --- | --- | --- |
| F0 Shared foundation | A + B, one manifest owner | Documentation baseline | Scaffold two route shells, shared types/tokens, fixture, identity and persistence; run both experiences against one issue |
| F1 Live map and read views | A presentation / B data | F0 | Real basemap, permitted bounds query, selected issue sheet, list fallback, freshness states; second session changes the selected issue without camera reset |
| F2 Report and LLM preparation | A form / B adapter/API | F0 | Description/location/photo draft, valid editable suggestion, related issues, persisted report even on AI failure; new issue appears in F1 |
| F3 Authority collaboration | B | F0, F2 | Relevant inbox, two organization assignments, lead rules, private/public updates; public session sees only published response |
| F4 Team tracking | B with A shared components | F3 | Worker assignment and actual milestone writes; stale work timestamps; task completion cannot close another assignment |
| F5 Evidence and notifications | A UI / B events | F2, F3 | Second resident contributes, followers receive one public notice, attachments enforce ownership |
| F6 Integration and presentation | All | F1-F5 | Full demo, failure scenarios, viewport/accessibility review, performance measurement, limitations card |

The public and authority presentation work can proceed independently after F0 contracts are exercised. Do not implement each app against separate invented mock schemas. F2-F5 should merge incrementally so F6 is verification, not first integration.

## Foundation exit requirements

- [ ] Pin compatible stable dependency versions; record Node/npm versions and commit one lockfile when authorized.
- [ ] Add real install/dev/build/test commands to README only after executing them.
- [ ] Generate CSS variables from the canonical tokens; import one shared status component.
- [ ] Define and validate canonical enums/payloads in `src/contracts/`.
- [ ] Configure a tile/style source with attribution and a server-side LLM adapter; document which demo dependencies require network access.
- [ ] Create migrations and tests for public/staff projection separation and memberships.
- [ ] Seed one fictional scenario and provision separate resident, coordinator, and worker demo identities.
- [ ] Confirm each identity sees only permitted fields/actions and both app routes load the same issue ID.

## Functional acceptance matrix

Record an observed result, commit, and evidence location when executing. All rows below are pending application implementation.

| ID | Scenario | Expected result |
| --- | --- | --- |
| Q01 | Resident submits and refreshes | One persisted issue with original wording and confirmed summary |
| Q02 | Another session keeps map open during creation/update | Marker/detail update within target under demo conditions; camera/focus unchanged |
| Q03 | Live subscription fails | Polling mode says every 15 seconds; stale after 30 seconds without successful sync |
| Q04 | Tiles fail or geolocation is denied | List/manual location still supports issue discovery/reporting |
| Q05 | Similar report is suggested | Resident can add evidence or continue a distinct report; no silent merge |
| Q06 | Two authorities accept the same issue | Distinct organization assignments, one lead, shared thread |
| Q07 | Two coordinators claim lead concurrently | One succeeds; other sees conflict/join option, no overwritten ownership |
| Q08 | Worker marks en route/on site/working | Actor/time persisted; public gets only approved aggregate updates |
| Q09 | One work task completes | Other tasks/assignments and issue remain open |
| Q10 | Lead attempts early resolution | Required unfinished assignments listed; resolution blocked |
| Q11 | All required work completed and lead resolves | One resolution event updates map, timeline, and followers |
| Q12 | Resident adds evidence, then double taps retry | Evidence appears once; attachment ownership checked |
| Q13 | Staff note includes private test marker text | No public response, subscription, image URL, or notification contains it |
| Q14 | Resident calls authority API directly | Backend rejects; changing hidden UI controls grants no authority |
| Q15 | Foreign worker changes another team's task | Backend rejects |
| Q16 | Old editor publishes after newer update | 409 with current version; draft preserved for review |
| Q17 | LLM unavailable/malformed/unknown organization ID | Original report submits; suggestions fail visibly; routing awaits review |
| Q18 | LLM responds after resident confirmed edited fields | No overwrite of confirmed title/summary/category |
| Q19 | Unsupported/oversized photo or failed upload | Specific file error, retry/remove available, no silent loss |
| Q20 | Reconnect after missed events | Fresh snapshot/cursor; no duplicate notifications or regressed version |
| Q21 | Private residence with exact coordinates/photo metadata | Public output uses coarse location and sanitized derivative; exact data stays private |
| Q22 | Resident requests reopening / reports later recurrence | Explicit request or separate linked incident; no automatic status rewrite |

## Design inspection matrix

| View/state | 360x800 | 390x844 | 430x932 | Desktop 1440x900 |
| --- | --- | --- | --- | --- |
| Public map, selected marker, sheet | Pending | Pending | Pending | Pending |
| Report with keyboard and validation | Pending | Pending | Pending | Pending |
| Issue response and evidence sheet | Pending | Pending | Pending | Pending |
| Authority inbox and assignment blocks | Pending | Pending | Pending | Pending |
| Field-work progress and blocker | Pending | Pending | Pending | Pending |
| Offline/failure/conflict states | Pending | Pending | Pending | Pending |

Also check a short landscape screen, 200% text scaling, full keyboard path, visible focus, screen-reader labels, reduced motion, touch targets, and normal/control/status contrast. Verify no horizontal page overflow and no actions hidden behind the keyboard or safe-area bars.

Static visual-reference checks are recorded separately in `docs/design/REVIEW.md`. Passing those cannot mark these application checks complete.

## Three-minute demo script

Use [the current operational walkthrough](DEMO.md) for startup and exact presenter actions, including the optional urgent phone notification and transit segment. The short outline below remains the core shared-response narrative.

Use separate resident and coordinator sessions visible side by side, with a worker session ready. All organizations/data are visibly labeled demonstration accounts. Seed the map with a few fictional issues to establish context; the new report should be created during the demonstration.

| Time | Operator/action | What judges should see |
| --- | --- | --- |
| 0:00-0:20 | Resident opens map and selects Report | Place-first design; simple input and useful nearby context |
| 0:20-0:50 | Describe branch obstruction, confirm location, review LLM result | Plain input becomes structured, editable, actionable report |
| 0:50-1:10 | Send report; authority inbox is already open | Shared map/inbox update without refresh; actual persisted issue |
| 1:10-1:40 | Harbour Parks accepts lead; Street Response joins | Two organizations coordinate one issue and separate assignments |
| 1:40-2:05 | Second resident adds evidence; coordinator reads it | Shared thread accumulates useful local knowledge |
| 2:05-2:35 | Worker reports on site; coordinator publishes next step | Work tracking and public update connect across screens |
| 2:35-2:55 | Complete assignments and resolve as lead | Guarded completion, follower notice, resolved map marker |
| 2:55-3:00 | State impact | “One report, a coordinated response, and progress everyone can follow.” |

Earlier milestones may be prepared for the final resolution segment to fit the clock, but label prepared demo state. Do not pretend a real crew completed physical work in three minutes. If LLM processing uses a fixture, say so; do not claim a live model run.

## Rehearsal and fallback

- Rehearse with the exact network, device/browser, accounts, and seed fixture used for judging.
- Run the demo twice from resettable application-owned data; do not delete unrelated records to reset it.
- Keep the HTML visual reference available for explaining design if the network fails. Introduce it as a visual simulation, not the connected app.
- Preserve a short limitations note: municipal integration, real-world dispatch, continuous GPS, and predictive tree assessment are outside this prototype.
- Capture a real connected demo recording after the workflow passes; do not substitute a reference animation for that evidence.

## Judging emphasis

This is an internal quality rubric, not an assertion about the event's undisclosed scoring weights. Prioritize legibility, consistent visual language, a memorable place-based interface, low-friction reporting, cross-organization collaboration, understandable progress, and an honest end-to-end demonstration.

Visual polish means the failure, empty, loading, and transition states are as deliberate as the opening map. Decorative screens that cannot complete the journey do not satisfy the release gate.
