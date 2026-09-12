# Engine and application implementation brief

Branch: `feat/llm-engine`. User authorized the complete public and authority prototype, excluding the real map and LLM-provider connection. This brief refines the baseline for the current build.

Provider follow-up (2026-09-12): the user selected Anthropic / `claude-sonnet-4-6`. The server adapter is now implemented behind the existing provider interface; this supersedes the original no-connection boundary for Anthropic only. The real map remains excluded. See [ENGINE](ENGINE.md) for private configuration and [VERIFICATION](VERIFICATION.md) for actual live-test status.

## Decisions for this branch

- One Next.js app with shared TypeScript types at `src/contracts/index.ts`.
- `src/server/engine/` is a reusable provider-neutral module; provider/model stay unset. Explicit demo suggestions and an unconfigured failure state both work.
- Persist prototype records and sessions in local SQLite through Node 24's built-in driver. Supabase deployment integration remains a future adapter; do not claim it is connected.
- Local demo accounts use server-issued HttpOnly sessions with roles/organizations resolved from seeded records. Demo identity entry is clearly labeled and restricted to loopback usage. No public authority registration.
- Real photo uploads are validated and re-encoded with sharp to remove metadata, with private storage and owner checks.
- Real persisted updates are refreshed across sessions by bounded 3-second polling, with last-sync/offline state; no simulated live backend.
- A single `MapPlaceholder` component accepts issue/location/selection props. The map team replaces this component without changing report records or routes. It does not claim real geographic interaction.
- Work assignments, team milestones, staff/public notes, evidence, follows, notifications, reopening, and guarded resolution use shared issue records.
- Report creation supports the fictional directory's Halifax area only (latitude 44.5–44.85, longitude -63.85–-63.4). Outside locations receive an explicit validation error; no worldwide triage service is implied.

## Work ownership

1. Controller: root build/config/types, map placeholder, integration docs, tests and browser verification.
2. Engine agent: only `src/server/engine/**`, `tests/engine/**`. Implement provider interface, schemas, routing/candidates, preparation lifecycle runner, deadlines/retries, deterministic explicit demo provider, privacy-safe extractive progress summaries, and tests.
3. Backend agent: only `src/server/app/**`, `src/app/api/**`, `tests/backend/**`. Implement SQLite workflow, role/session permissions, attachments, HTTP handlers, persistence, and endpoint tests.
4. Frontend agent: only `src/app` outside `api`, `src/components/**`, `src/features/**` outside `map`, and UI styles. Build all mobile screens using the shared contracts and HTTP interface below.

Agents do not change manifests/contracts, commit, push, or edit one another's files. Coordinate interface changes with the controller.

## Stable HTTP integration

All paths start `/api/v1`. Lists use `{items,nextCursor:null,syncedAt}`. Other success responses use `{data}`; mutations include the newly updated relevant record. Errors use the shared ApiFailure envelope. Include cookies on same-origin requests. Mutations use `Idempotency-Key` for issue/contribution/assignment creation; versioned updates use `expectedVersion`.

| Request | Body / data |
| --- | --- |
| GET `/session` | SessionInfo; account list only in local demo |
| POST `/session` | `{accountId}` -> SessionInfo; create session cookie |
| DELETE `/session` | sign out |
| GET `/organizations` | Organization list |
| GET `/teams` | Own organization's Team list |
| GET `/issues?category=&status=&q=&following=true&bbox=` | Public IssueSummary list |
| GET `/issues/:id` | Public IssueDetail |
| POST `/issues` | CreateIssueInput -> IssueDetail |
| POST `/report-preparations` | PreparationInput -> Preparation |
| GET `/report-preparations/:id` | Owner-scoped Preparation |
| POST `/issues/:id/contributions` | `{body,attachmentIds}` -> Contribution |
| PUT `/issues/:id/follow` | `{following}` -> `{following}` |
| POST `/issues/:id/reopen-requests` | `{reason,attachmentIds}` -> ReopenRequest |
| GET `/notifications` | Own Notification list |
| PATCH `/notifications/:id` | `{read:true}` -> Notification |
| POST `/attachments` | multipart FormData `file` and `description`; -> Attachment after validation/re-encode |
| GET `/attachments/:id` | permitted image bytes; no private original served |
| GET `/authority/inbox?scope=relevant|assigned` | Authorized IssueSummary list |
| GET `/authority/issues/:id` | Permitted IssueDetail with staff additions |
| POST `/authority/issues/:id/assignments` | `{purpose,required,expectedVersion}` -> IssueDetail; organization from session |
| POST `/authority/assignments/:id/tasks` | `{teamId,purpose,expectedVersion}` -> IssueDetail; choose team member server-side |
| GET `/authority/work` | Own/organization WorkTask list |
| POST `/authority/tasks/:id/progress` | `{status,note,expectedVersion}` -> IssueDetail |
| POST `/authority/assignments/:id/progress` | `{status,nextStep,expectedVersion}` -> IssueDetail |
| POST `/authority/issues/:id/updates` | `{visibility,text,expectedVersion}` -> IssueDetail |
| POST `/authority/issues/:id/decisions` | `{action,reason,expectedVersion,assignmentId?,requestId?,targetOrganizationId?,priority?}` -> IssueDetail |
| GET `/authority/issues/:id/summary` | Coordinator-only summary of public events -> ProgressSummary |

Supported decisions: acknowledge, set_priority, release_requirement, nominate_lead, accept_lead, resolve, accept_reopen. One lead, own-organization task edits only. New accepted assignments are required by default; only the lead can release a requirement with a recorded reason. A task cannot complete an assignment automatically; required incomplete assignments block issue resolution. Workers update their assigned tasks; coordinators publish public updates.

## Engine integration surface

The engine exports `prepareReport(input, context, options?) -> Promise<EngineResult>` and `summarizeProgress(events) -> ProgressSummary`. `EngineResult` includes `suggestion`, `mode`, `provider`, `model`, `promptVersion`, `attempts`, and `latencyMs`. Typed EngineError carries stable code, user-safe message, and attempts. The caller owns preparation ID, persistence, queued/running/terminal transitions and owner authorization. No provider is selected implicitly. The application resolves `OPENHFX_ENGINE_MODE` and passes `options.mode`; the reusable library does not read environment variables and defaults to `demo` when its option is omitted. Explicit `unconfigured` fails safely. A configured adapter is injected through `options.provider`.

PrepareReport only receives public candidate issues and the fixed directory. Candidate matching is bounded geographically. Output organization and issue IDs are checked against eligible supplied candidates. Suggestions never mutate issue status. Progress summarization deterministically extracts only published public events and retains source IDs, so it works without a model and cannot invent work.

## Verification gates

- [x] Engine tests cover category/routing, unknown IDs, prompt-like input, refusal/failure, one retry, total deadline, no-provider state, and staff-event exclusion.
- [x] Backend tests cover role boundaries, durable data, independent organization assignments, conflicts/idempotency, uploads, public/private visibility, and final resolution.
- [x] Full build and typecheck pass.
- [x] Six independent HTTP sessions demonstrate report -> authority assignment -> worker progress -> public update -> evidence -> resolution.
- [x] Focused phone-width browser journeys exercised; map placeholder and demo suggestions clearly identified. Physical-phone/full accessibility checks remain open.
- [x] Integration documentation gives exact setup commands and the map/provider replacement boundaries.

See [VERIFICATION](VERIFICATION.md) for observed evidence and unverified boundaries.
