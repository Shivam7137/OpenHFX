# Product brief

Baseline: 1.0 | 2026-09-12 | Owner: product/demo lead

## Promise

Residents can report a problem without knowing which organization handles it. Authorities receive a clear, relevant report, work together, and keep affected people informed. The defining interaction is a place becoming a shared issue, then a visible coordinated response.

## Confirmed direction and selected defaults

| Decision | Basis |
| --- | --- |
| Two mobile web experiences, one codebase | User confirmed |
| Live map with updates is core | User confirmed; supersedes initial map deferral |
| Residents add evidence/details after submission | User confirmed |
| Multiple authorities work on the same issue | User confirmed |
| Agent tracking means teams/field workers and work progress | User clarified |
| LLM assists with interpreting and directing reports | User confirmed |
| One lead coordinates collaborating authorities | Accepted concept carried forward |
| Team milestones without continuous GPS | Version 1 scope default |
| Halifax demo setting; fictional organizations/cases | Project default; no municipal integration claim |
| Open browsing; sign-in for contributions/follows | Implementation default |
| Daily-use transit alongside local problems | User requested bus information, markers, and a more useful daily view |
| Shaded problem areas | User clarified: resident-reported estimates, not a distance filter or confirmed hazard boundary |
| Simulated transit presentation mode | User requested fake moving buses and stops for the demo; clearly labeled and separate from real transit information |

Defaults let the team work consistently. Change shared decisions through [TEAM.md](TEAM.md), rather than making different choices in each feature.

## People and jobs

| Person | Job | Successful outcome |
| --- | --- | --- |
| Reporting resident | Explain what is wrong and where | Saved report/contribution with a clear next step |
| Nearby resident | Understand impact and add evidence | Finds the existing issue and follows it |
| Coordinator | Organize a relevant response | Accepts responsibility and coordinates organizations/teams |
| Field worker | Know what to do and report progress | Records arrival, work, and completion evidence |

Field-worker screens are role-based views inside `/authority`, not another application.

## Central example

A resident reports a branch obstructing a public walkway. Another adds a photo showing the remaining accessible route is blocked. The demo parks organization takes the lead; the demo streets organization manages access. A field team reports en route, on site, and work progress. The parks assignment completes first; the overall issue stays open until streets finishes and the lead resolves it. Followers see updates and the map changes status.

Fictional demo organizations: **Harbour Parks**, **Street Response**, **Access Services**. No government seals or implied partnerships. Every seeded case is clearly labeled demo data.

## Core release

1. Live map and equivalent issue list with category, status, location, and freshness.
2. Text/location/photo reporting with editable AI output and related-issue suggestions.
3. Shared evidence thread, public timeline, follows, and in-app notifications.
4. Authority sign-in, organization matching, assignment acceptance, and collaboration.
5. Team progress: assigned, en route, on site, working, blocked, complete.
6. LLM transformation with permitted organization IDs and suggested next actions.
7. Recorded, permission-checked events reflected across both apps.
8. Resettable demo fixtures and a reliable presentation journey.

Static screens are design references, not implementation of these capabilities. Release requires a connected journey.

## Outside this release

The daily-use follow-up adds public Halifax Transit stop information, provider departure predictions, service notices, and device-local saved stops. This is a read-only public-data integration; problem reports remain fictional demo records. It does not add trip planning, a full timetable, moving vehicles, or locally inferred arrival estimates. See [TRANSIT](TRANSIT.md).

User-approved demo exception (2026-09-12): an explicit coordinator action may initiate a spoken demonstration call to the user-controlled +19024739228 for an unresolved, authority-reviewed urgent demo issue. This does not authorize automatic AI-triggered contact or emergency dispatch. See [DEMO_CALLS](DEMO_CALLS.md).

- Native app-store packages, background GPS, moving vehicles, and inferred arrival estimates.
- Automatic external contact, emergency dispatch, municipal integration, or unverified staff onboarding.
- Autonomous authority decisions, tree-failure prediction, and photographic risk claims.
- Public worker identities/coordinates, popularity-based priority, and a general social feed.
- Video, offline mutation queues, SMS/native push, and mandatory chatbot reporting.

## Secondary topics

**The same blocked driveway:** add evidence to a currently open obstruction. A later incident after the first ends becomes a linked occurrence. Show “3 linked occurrences”; do not inflate evidence counts into incident counts.

**Which tree falls first:** tree-concern reporting, authority-reviewed inspection priority, and inspection assignments. Use “Inspection priority,” never “Probability of falling.” Prediction is outside this release.

## Product invariants

- One issue ID connects map, thread, evidence, assignments, teams, and notifications.
- Organization matching gives visibility; accepting responsibility is explicit.
- One team's completion cannot close another organization's work.
- Public/staff visibility is enforced before serialization and notifications.
- Preserve residents' original wording separately from the editable AI summary.
- Reports survive AI failure. Unknown routing reads “Awaiting assignment.”
- Connection freshness and work progress are separate facts.

## Prototype targets

Targets to measure, not current performance claims:

- A new participant finds Report and understands the first step without coaching.
- Reporting takes under 60 seconds in the prepared usability case, excluding optional capture/sign-in delays.
- A confirmed update reaches a second session within 3 seconds on the demo network; stale/fallback states remain honest when it does not.
- A judge identifies responsible organizations, team progress, and next action in 10 seconds.
- The main demo takes about 3 minutes and includes a real cross-session update.
- Main flows work at 360 CSS pixels wide and with keyboard navigation; map tasks have a list alternative.

## If time is tight

Protect map, reporting, shared thread, two-authority collaboration, team progress, and one LLM transformation. Cut filter depth, extra scenarios, analytics, and decorative motion first. Label disconnected capabilities rather than presenting fabricated success.
