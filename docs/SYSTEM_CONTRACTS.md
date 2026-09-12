# Shared system contracts

Baseline: 1.0 | 2026-09-12 | Owner: Builder B; consumer review: Builder A

These names and rules are the contract for both experiences. Product and screen behavior: [PRODUCT](PRODUCT.md), [DESIGN_SPEC](DESIGN_SPEC.md). The user-approved local prototype refines deployment and HTTP details in [IMPLEMENTATION](IMPLEMENTATION.md): Node 24 SQLite, loopback-only demo sessions, sanitized local image storage, and three-second authorized snapshot polling replace the unconnected Supabase services described below. Real map/provider connection remain excluded. `src/contracts/index.ts` defines current wire types; the implementation endpoint table is authoritative for this branch. Hosted RLS/subscriptions below remain integration requirements, not implemented claims.

## Architecture and dependencies

One Next.js/TypeScript app hosts `/public`, `/authority`, and server-side API handlers. Supabase supplies Auth, Postgres, private photo storage, and Realtime. PostGIS handles geographic queries. MapLibre GL JS renders the map. Use CSS variables generated from `docs/design/tokens.json`, Radix primitives for accessible overlays, Lucide icons, and Zod for shared payload validation. Avoid adding a second component kit or state system for one role.

The foundation task pins compatible stable dependency versions in one lockfile and records the Node/package-manager versions. No version is claimed installed by this document. MapLibre needs a separately configured style/tile provider and visible attribution; do not treat public demo tiles as a production service. Manual pin placement remains usable if geocoding is not configured.

Keep authentication, authorization, issue mutations, LLM calls, and storage signing on the server. Use per-user authorization for database access; service credentials must never reach browsers. Database grants and RLS are required on exposed data. Public and staff projections are separate because row permissions do not by themselves remove sensitive columns.

Official implementation references, checked 2026-09-12: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [MapLibre feature updates](https://maplibre.org/maplibre-gl-js/docs/examples/update-a-feature-in-realtime/), [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostGIS](https://supabase.com/docs/guides/database/extensions/postgis). These support the selected building blocks; the architecture and acceptance targets are project decisions.

## Planned boundaries

```text
src/
  app/public/             Public routes
  app/authority/          Coordinator and worker routes
  app/api/v1/             Validated server entry points
  components/             Shared controls, sheets, statuses, evidence rows
  features/map/           Map/list presentation and marker selection
  features/reporting/     Draft, preparation, submission, contributions
  features/following/     Public notifications and follows
  features/coordination/  Authority inbox and organization assignments
  features/teams/         Worker tasks and progress
  contracts/              Types, Zod schemas, enums, API/event definitions
  server/                 Permissions, transactions, routing, engine adapter
  data/demo/              One fictional fixture and explicit event script
  styles/                 Generated tokens and shared styles
supabase/                 Migrations, seed data, policy tests
```

## Canonical enums

| Type | Serialized values | Display |
| --- | --- | --- |
| Category | `access`, `trees`, `roads`, `lighting`, `waste`, `other` | Access, Trees, Roads, Lighting, Waste, Other |
| IssueStatus | `reported`, `acknowledged`, `assigned`, `in_progress`, `resolved` | Reported, Acknowledged, Assigned, In progress, Resolved |
| AssignmentStatus | `accepted`, `in_progress`, `complete`, `withdrawn` | Accepted, In progress, Complete, Withdrawn |
| WorkStatus | `assigned`, `en_route`, `on_site`, `working`, `blocked`, `complete` | Assigned, En route, On site, Working, Blocked, Complete |
| Priority | `standard`, `priority`, `urgent` | Standard, Priority, Urgent |
| Visibility | `public`, `staff` | Public update, Staff note |
| MembershipRole | `coordinator`, `worker` | Coordinator, Field worker |
| AiRunStatus | `queued`, `running`, `succeeded`, `failed` | Internal processing metadata |

Needs information is an explicit issue/assignment flag with a question, not a competing lifecycle. Reopening is an event that moves an issue back to `in_progress`. Superseding an AI suggestion is not a status change.

## Core records

All times are UTC ISO-8601, all IDs are opaque strings (UUIDs in persistence), and mutable records carry integer `version`. Geographic database coordinates use SRID 4326. JSON uses `{ latitude, longitude }`; GeoJSON conversion must output `[longitude, latitude]`.

| Record | Required fields and purpose |
| --- | --- |
| User | `id`, `displayName`; contact/identity fields private |
| Organization | `id`, `name`, `categoryIds`, `serviceArea`, `isDemo` |
| Membership | `userId`, `organizationId`, `role`, `active`; provisioned, not user-editable |
| Issue | `id`, `reference`, `reporterId`, `originalDescription`, `title`, `summary`, `category`, `exactLocation`, `publicLocation`, `publicLocationLabel`, `locationPrecision`, `status`, `priority`, `priorityReviewedBy`, `leadOrganizationId`, `needsInformation`, `version`, `createdAt`, `updatedAt`, `isDemo` |
| Assignment | `id`, `issueId`, `organizationId`, `ownerUserId`, `purpose`, `required`, `status`, `nextStep`, `needsInformation`, `version` |
| Team | `id`, `organizationId`, `name`, `memberUserIds` |
| WorkTask | `id`, `assignmentId`, `teamId`, `assigneeUserId`, `purpose`, `status`, `previousActiveStatus`, `lastReportedAt`, `resultNote`, `version` |
| Contribution | `id`, `issueId`, `authorId`, `body`, `attachmentIds`, `createdAt`, `moderationState` |
| Attachment | `id`, `ownerId`, `issueId` (nullable before report), `mimeType`, `bytes`, `description`, `processingStatus`, `storageKey`; storage key is private |
| Event | `id`, `sequence`, `issueId`, `type`, `actorId`, `organizationId`, `visibility`, `publicText` or `staffText`, `createdAt`, `issueVersion` |
| Follow | unique `(userId, issueId)` |
| Notification | `id`, `userId`, `issueId`, `eventId`, `readAt`; unique `(userId, eventId)` |
| IssueRelation | `fromIssueId`, `toIssueId`, `kind` = `related` or `recurrence`; confirmed by user/staff |
| AiRun | `id`, `reportDraftId` or `issueId`, `status`, `inputVersion`, `modelId`, `promptVersion`, `output`, `errorCode`; staff/server only |

`leadOrganizationId`, reviewed priority actor, and private assignment owners may be null before acceptance/review. Location precision is `exact` for publishable public infrastructure or `approximate` for sensitive/private-residence context. For approximate cases, generate one stable public point on a 100 m grid and an area label; keep exact location private. Public APIs, nearby matching responses, and photos must not reintroduce the exact address or metadata. Related-issue search uses the already public location for resident suggestions.

## Public and authority views

Presentation-only transit exception: `GET /transit/demo` exposes the canonical fictional `DemoTransitScenario` (`isDemo:true`, illustrative routes, stops, and vehicle offsets). `Transit mode` animates this scenario locally; it creates no issue, vehicle tracking, ETA, or authority event. Real GTFS endpoints remain unchanged. See [TRANSIT](TRANSIT.md).

Daily map addition: `IssueSummary` and `CreateIssueInput` include optional `impactRadiusMeters` (integer 0–500, default 0/unknown). This is the resident's approximate area estimate, never an authority decision. Its polygon is generated exclusively around `publicLocation`; resolved issues have no area shading. Sensitive locations retain their public grid point. New seed estimates are explicitly fictional; old records without the field stay unshaded. Transit has separate read-only types in `src/contracts/transit.ts` and does not introduce an issue category or status. [TRANSIT](TRANSIT.md) defines those response/freshness contracts.

`PublicIssue` contains only ID/reference, title, public summary, category, public location/label/precision, lifecycle, reviewed priority if present, published next step, public organization progress, public evidence counts, timestamps, version, and demo flag. Never include reporter ID/contact, exact private coordinates, staff notes, assignee IDs, internal blocker reasons, storage keys, or raw AI input/output.

`AuthorityIssue` adds permitted original description, exact location, assignments, work tasks, and staff events. Participating organizations share issue staff notes; unrelated organizations do not. Reporter contact is restricted to participating coordinators. Workers receive the operational description/location and their tasks, not reporter contact.

`WorkTaskPublicSummary` is an intentional published summary containing organization, milestone, and reported time. Individual team/worker identities and location trails are never public.

## Permissions

| Action | Visitor | Resident | Matching coordinator | Participating coordinator | Assigned worker |
| --- | --- | --- | --- | --- | --- |
| Read public issues/map/events | Yes | Yes | Yes | Yes | Yes |
| Create issue/contribution/follow | Sign in | Yes | As resident | As resident | As resident |
| See relevant inbox | No | No | Own organization | Own organization | No |
| Acknowledge/accept organization assignment | No | No | Own organization | Own organization | No |
| Assign team; complete organization assignment | No | No | After acceptance | Own organization | No |
| Update team work milestone | No | No | No | Own organization's tasks | Own assigned tasks |
| Read shared staff thread | No | No | After acceptance | Yes | For assigned issues |
| Publish public progress | No | No | After acceptance | Yes, own organization | Draft for coordinator |
| Resolve/reopen/transfer lead/release required work | No | Request only | No | Lead coordinator only | No |

Organization matching checks category plus service-area membership on the server. A filtered inbox is not authorization. In the local prototype, new reports outside directory coverage are rejected with a location validation message; all supported categories have a directory match in the Halifax demo area. A global manual-triage coordinator is not provisioned. Extending coverage requires an explicit directory/triage decision; LLM output cannot grant membership or access.

## Transactions and lifecycle

`reported -> acknowledged`: a coordinator records review. `acknowledged -> assigned`: a lead organization accepts; a single atomic action can record both acknowledgement and assignment events. Enforce one active assignment per `(issueId, organizationId)` and one current lead.

`assigned -> in_progress`: a participating coordinator starts accepted work. A worker's first active milestone may advance its organization's assignment and the issue to `in_progress` in the same transaction if that assignment is accepted. Its public message still requires coordinator publication; lifecycle progression is visible without exposing a private worker action.

`in_progress -> resolved`: lead coordinator supplies a resolution note. All required assignments must be complete, or explicitly released as unnecessary with a reason. All unfinished work tasks under a completed assignment must first be completed or reassigned/released with a recorded note. Work-task completion alone cannot resolve an assignment or issue.

Lead transfer: current lead nominates a participating organization; its coordinator accepts before the lead changes. The old lead stays accountable until acceptance. Withdrawal of a lead requires accepted transfer first. Withdrawing a required assignment requires the lead to reassign it or release the requirement explicitly.

Reopen: a resident creates a request with evidence. Lead accepts, returns issue to `in_progress`, and reactivates/creates the necessary assignment. A distinct later occurrence creates a linked issue instead.

All guarded mutations include `expectedVersion` and `Idempotency-Key`. `expectedVersion` belongs to the endpoint's target issue, assignment, or task; transactions separately lock/check any parent records they also change. Replayed keys by the same actor return the original result; changed payload under the same key is rejected. A transaction writes the domain change, event, and notification/outbox row together. On version conflict return 409 plus current version; preserve the client's draft and require review before retry.

## API boundary

Prefix `/api/v1`. Lists return `{ items, nextCursor, syncedAt }`; cursor is opaque. Mutations return `{ data, eventId, version }`. Errors return `{ error: { code, message, fieldErrors? }, requestId }`. Cursor/event sequences are strings in JSON to avoid integer precision loss.

| Method and path | Payload / result |
| --- | --- |
| `GET /issues?bbox=west,south,east,north&category=&status=&cursor=` | Sanitized public issues; bounded/page-limited |
| `GET /issues/:id` | PublicIssue |
| `POST /report-preparations` | `{ draftId, originalDescription, publicLocation, category? }` -> preparation ID/status |
| `GET /report-preparations/:id` | Owner-only validated suggestion or failure |
| `POST /issues` | `{ draftId, originalDescription, title, summary, category, exactLocation, publicLocationLabel, sensitiveLocation, attachmentIds, preparationId? }` -> saved issue; auto-follow reporter |
| `POST /issues/:id/contributions` | `{ body, attachmentIds }`; authenticated owner |
| `PUT /issues/:id/follow` | `{ following: boolean }`; upsert/remove own follow |
| `POST /issues/:id/reopen-requests` | `{ reason, attachmentIds }` |
| `GET /issues/:id/events?after=` | Public events only |
| `GET /authority/inbox?scope=relevant|assigned&cursor=` | Organization-authorized inbox |
| `GET /authority/issues/:id` | Authorized AuthorityIssue |
| `POST /authority/issues/:id/assignments` | `{ organizationId, purpose, required, expectedVersion }`; accepting organization only; lead controls required designation for contributors |
| `POST /authority/assignments/:id/tasks` | `{ teamId, assigneeUserId, purpose, expectedVersion }`; own organization |
| `POST /authority/tasks/:id/progress` | `{ status, note, attachmentIds, expectedVersion }`; owner or own coordinator |
| `POST /authority/assignments/:id/progress` | `{ status, nextStep, expectedVersion }`; own coordinator |
| `POST /authority/issues/:id/updates` | `{ visibility, text, sourceTaskId?, expectedVersion }`; coordinator publication or staff note |
| `POST /authority/issues/:id/decisions` | `{ action, reason, assignmentId?, targetOrganizationId?, requestId?, expectedVersion }` |
| `GET /authority/issues/:id/events?after=` | Authorized public + staff events |
| `GET /notifications?cursor=` | Own notifications |
| `PATCH /notifications/:id` | `{ read: true }`; own recipient |
| `POST /attachments` | `{ mimeType, bytes, description }` -> owner-scoped signed upload target and ID |
| `POST /attachments/:id/finalize` | Validate uploaded file, strip metadata, produce allowed derivative; return readiness |

Decision `action` enum: `acknowledge`, `set_priority`, `release_requirement`, `nominate_lead`, `accept_lead`, `resolve`, `accept_reopen`. `set_priority` additionally requires `priority`; other optional fields are required by the action schema where relevant. Validate the actor and referenced organization/task against the issue in every handler.

Photos: JPEG/PNG/WebP, at most 10 MB each and three per report/contribution. Validate content and size on the server, not MIME string alone. New objects remain private until finalization. A report can submit without photos only after explicit removal of failed attachments. Limit text to 2,000 characters; report descriptions require at least 20, evidence requires text or a ready photo. Whitespace-only content is empty.

Error codes: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VERSION_CONFLICT` (409), `IDEMPOTENCY_CONFLICT` (409), `ATTACHMENT_NOT_READY` (409), `RATE_LIMITED` (429), `TEMPORARY_FAILURE` (503). AI failure is handled by the preparation resource and does not make an otherwise valid issue creation fail.

## Live map and notifications

Publish sanitized public issue projections/events separately from staff records. Subscribe public clients only to public event/projection tables. Subscribe staff clients to authorized staff streams with database policies; client filters are not access control. Never subscribe public browsers to raw issue rows containing exact/private fields.

Each event has an immutable ID and monotonic sequence. Event types: `issue.created`, `issue.acknowledged`, `issue.progressed`, `assignment.accepted`, `task.progressed`, `assignment.progressed`, `update.published`, `evidence.added`, `issue.resolved`, `reopen.requested`, `issue.reopened`, `lead.transferred`, `requirement.released`. `task.progressed` is staff-only; a published summary creates its own public `update.published` event. If a work milestone advances the issue lifecycle, the same transaction records a sanitized public `issue.progressed` event with only the new lifecycle and organization, never the private worker note.

On an event, invalidate/refetch the affected permitted issue and patch the map source by stable issue ID. Ignore duplicates; never let a lower version overwrite a newer one. Subscribe before initial fetch, buffer events during fetch, then refetch affected IDs. On reconnect obtain a fresh permitted snapshot and resume from the returned cursor; do not assume Realtime replays everything missed.

Aim for updates within 3 seconds on the demo network. Use bounded 15-second polling after subscription failure; mark the mode visibly. Last successful sync older than 30 seconds is stale. Pause unnecessary polling in hidden tabs and refetch on focus. Timings are product targets, not provider guarantees.

Create recipient notifications once using `(userId,eventId)` uniqueness, excluding the actor. Public events reach public followers; staff notes reach eligible staff only. A notification points to its source event. AI summary failure falls back to the recorded public text, never drops the event.

No field-worker GPS endpoint or location history is part of this contract. A team badge on the map refers to the assignment location and must be labeled that way.

## LLM engine contract

One server-side provider adapter accepts only needed report text, public location context, fixed category enums, candidate public issues, and allowed organization directory entries. Do not send contact details, staff notes, or raw photo metadata. Version 1 uses text evidence; image interpretation is not required.

```typescript
type ReportSuggestion = {
  title: string; // 8-100 characters
  summary: string; // 20-500 characters
  category: 'access' | 'trees' | 'roads' | 'lighting' | 'waste' | 'other';
  suggestedOrganizationIds: string[]; // subset of supplied directory IDs, max 3
  possibleRelatedIssueIds: string[]; // subset of supplied candidate IDs, max 3
  clarificationQuestions: string[]; // max 2, each max 160 characters
  suggestedNextSteps: string[]; // max 3, each max 200 characters
  prioritySuggestion: 'standard' | 'priority' | 'urgent';
  priorityReason: string; // max 240 characters; suggestion, not verified risk
};
```

Validate structured output with the shared schema. Unknown IDs/enums, missing required fields, or malformed output result in `failed`; retain the original report and route to manual review. Version the prompt/model and record latency/error category without logging secrets. User text is data, not executable instructions; the adapter has no external-contact or authority-mutation tools.

Pipeline: save draft context -> select candidate public issues by distance/category -> one structured model request -> schema/directory validation -> show editable suggestion -> resident confirms report. Do not auto-merge duplicates. User-edited title/summary/category take precedence and are stored as confirmed values; keep the AI suggestion for provenance.

Per preparation: one model call, at most one retry for a transient provider failure, 20-second total deadline and a configured output-token cap. After 8 seconds the UI offers to continue without suggestions. A timed-out late result may be saved as an unaccepted suggestion, never overwrite confirmed fields. Retry on user request creates a new preparation version.

The provider/model is server configuration, not a UI choice. Pin it in deployment config during foundation and record it in run metadata. Never commit a key. A deterministic fixture adapter is permitted for a labeled demo mode; the judges must be told whether a displayed result was produced live or came from a fixture.

For progress summaries, use only published source event text and retain its IDs. No model call is needed for a map pan, team milestone button, counter, or ordinary status notification. Never fabricate elapsed work, priority certainty, ETAs, acceptance, or resolution.

## Canonical demo identity

Provider photo follow-up: `PreparationInput.attachmentIds?: string[]` accepts up to three unique uploaded photo IDs. The server authorizes ownership before queueing, then supplies bounded metadata-free image bytes and captions internally. No remote image URLs or client base64 are accepted. Text-only clients remain compatible. Provider mode sends photos to Anthropic; demo mode does not visually analyze them. See `ENGINE.md` for limits, privacy, and the opt-in live verification command.

Display reference `HFX-0142`: “Branch blocking the walkway,” category `trees`, public place “Harbour path,” demo-only map point near the Halifax peninsula. Real persistence uses generated UUIDs; fixtures export stable aliases for A/B to share. Sample organizations: Harbour Parks (lead), Street Response (contributor); sample team names: Canopy 2 and Access 1. These are fictional.

One fixture owns the issue, organizations, assignments, two resident accounts, workers, and chronological events. Both apps import/use it. The fixture must not include real personal data or claim the sample issue exists in Halifax.
# Optional urgent demo call contract

The user-approved Dispatcher integration adds call-attempt types in `src/contracts/demo-calls.ts`, without changing any issue/assignment/work statuses. Participating coordinators may GET `/api/v1/authority/issues/:id/demo-call` for `{configured,destination,call}` or POST `{expectedVersion,confirmed:true}` for an attempt. Existing session, origin and visibility checks apply; initiation is local-demo-only and requires an unresolved demo issue with reviewed `urgent` priority. The destination is fixed at +19024739228. Call state is `submitting|accepted|rejected|uncertain`; acceptance does not mean answered or delivered. `demo_call.*` audit events are staff-only. A durable per-issue reservation prevents duplicate network calls and survives restarts. See [DEMO_CALLS](DEMO_CALLS.md) for payload, setup, retry and failure boundaries.
