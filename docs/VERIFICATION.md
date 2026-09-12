# Local prototype verification

Date: 2026-09-12. Map integration target: `main`; earlier evidence below describes `feat/llm-engine`. This file records application evidence, not the older HTML design reference.

## Daily transit and reported areas

### Simulated transit-mode follow-up

User-requested presentation mode verified on 2026-09-12:

- `npm run verify` passed again: 129 tests across 11 files, strict types, and production build. New tests cover the public labeled scenario endpoint, distance-weighted movement, continuous turnaround, repeatable cycles, and stationary paths.
- Rebuilt demo-mode port-3001 server passed the six-session workflow smoke as HFX-0147. No paid model or phone call was made.
- Production browser at 1440 px showed four bus marker buttons and both illustrative routes. Marker positions changed during playback, remained identical during pause, and repeated after reset. Bus marker selection set its selected state; exiting removed all four marker elements.
- At 360 px, reduced-motion preference started the mode paused, Enter selected a focused bus marker, and selecting a demo stop displayed its name. No horizontal page overflow was measured at either width. Screenshots inspected: `.playwright-mcp/demo-transit-desktop.png` and `.playwright-mcp/demo-transit-mobile.png` (ignored local QA artifacts).
- Normal checks had zero runtime errors; the existing basemap nullable-property warnings remain. Mode labels identify the routes, stops, and movement as simulated. The simulation has no dependency on real GTFS availability, though basemap tiles still require network access. Physical-phone and screen-reader validation remain open.

Earlier daily-transit evidence follows; it describes the separate real-feed mode.

Verified on 2026-09-12 in the current local working tree, preserving concurrent demo-call work:

- `npm run verify` passed: strict types, 126 tests across 10 files, and the production build. This includes 25 offline transit tests, reported-radius persistence/validation, geodesic/private-coordinate/resolved-area checks, browser-side feed expiry, and the separate demo-call suite. No live provider or dispatcher call was made by this task.
- The rebuilt production server on port 3001, with explicit `OPENHFX_ENGINE_MODE=demo` and `.data/daily-nearby-verification`, passed `npm run smoke` as HFX-0146: six independent identities, two organizations, evidence, permission guards, resolution, and extractive summary.
- Actual Halifax feeds loaded successfully. The subagent's static probe found 2,358 stops, 81 routes, and 9,239 trips; three sampled stop boards had fresh predictions. The final integrated production endpoint for stop 6084 returned eight departures and fresh trip/alert timestamps. These are point-in-time observations, not availability guarantees.
- Browser testing detected duplicate 7A entries from a modified-trip alias. The backend now uses current trip identity and preserves distinct instances. A regression test covers that case; the production endpoint subsequently showed only one corresponding 7A journey.
- At 1440 px, a real map stop-symbol click opened its departure board. At 360 px, the map, problem panel, transit board, and report detail had no horizontal page overflow. Saved stop 6084 survived reload. Service notices precede departures; the official schedule/licence links remain available.
- A mobile form submission retained a selected 50 m radius through review and saved HFX-0145. Its API and public detail showed the same radius with estimate language. Rendering uses only public coordinates. The map showed the new polygon alongside the original seeded estimates; resolved smoke reports have no own shading.
- Deliberately stale board data hid all departure rows and showed separate stale-prediction/notice explanations. A controlled HTTP 503 showed retry; removing the interception and retrying restored eight real departure rows. An offline map-area search showed the offline explanation with no indefinite loading indicator. All browser intercepts/offline settings were restored afterward.
- Production screenshots were inspected locally at `.playwright-mcp/daily-transit-production-desktop.png` and `.playwright-mcp/daily-transit-production-mobile.png` (ignored QA artifacts). Existing nullable-property warnings from the basemap style remain; normal final map rendering had no runtime errors. The injected 503 produces its expected failed-network console entry.

Limitations: no route-line overlay, moving vehicles, full timetable, ferry predictions, or journey planner. Nearby filtering applies to the 30 returned closest stops. Notices without an explicit stop depend on observed serving trips; coverage is not comprehensive. Physical-device, screen-reader, sustained load, and municipal/production deployment validation remain open. The implementation/freshness contract is [TRANSIT](TRANSIT.md). This follow-up has not been committed or pushed.

## Selective map integration

The useful renderer code from `feat/public-map` (`6c75558`) was integrated into the persisted application at `29a1203`. The standalone map branch's second schema/fixture, disconnected actions, duplicate shell, and older app configuration were omitted. See [MAP_INTEGRATION](MAP_INTEGRATION.md) for the contract and retained functionality.

Observed checks on the integrated tree:

- Strict typecheck, 91 tests across six files, and the production build passed. Map regression coverage checks public-coordinate projection even from staff records, approximate flags, reviewed urgent priority, stable IDs/status refresh, empty filters, and persisted backend bounding-box searches.
- The production-server smoke passed on isolated port 3001 in demo mode: HFX-0145, six independent identities, two organizations, contributions, permissions, guarded resolution, and extractive summary. No paid provider call was made during map verification.
- Browser checks loaded actual OpenFreeMap tiles and same-origin MapLibre workers. Verified category filtering, map/list switching, explicit area query/reset, selected issue link, compact detail, and map resize at 360, 390, 430, and 1440 CSS pixels without horizontal page overflow. The map legend stays above the issue panel; desktop list growth scrolls within its panel.
- A report created from a separate resident session appeared through polling in the trees-filtered discovery view (two to three rows). Bounds before/after were identical: `-63.605759298195906,44.636536268193026,-63.56024070180396,44.66106113937889`. A separate worker session changed the seeded issue from assigned to in progress; the public row updated and its selected map link remained visible.
- A sensitive-location report displayed an approximate-area label in discovery and compact detail. The source-projection tests confirm exact coordinates/private fields cannot enter its GeoJSON.
- On the 390px report form, a map tap changed draft coordinates, direct coordinate entry worked, and denied geolocation left a usable manual path. Blocking tile-provider requests produced the fallback; coordinate editing still worked and Retry map recovered after requests were restored.
- Browser testing caught and fixed the branch's obsolete missing-image event handler for cluster counts using MapLibre's current resolver, a negative first-frame animation interval that produced invalid opacity, and a mobile panel overlap hiding the legend. Remaining provider-style warnings concern nullable road/boundary filter properties; they did not prevent rendering. Physical-phone, screen-reader, and full accessibility testing remain open.
- Final retest after those fixes: `npm run verify` passed again (91 tests, strict types, production build); the rebuilt production server passed smoke as HFX-0147. The production browser loaded real tiles, retained the selected issue link through a 390px resize, and had no runtime errors or horizontal overflow in that check.

The browser behavior above was exercised during integration using the isolated local store `.data/map-integration-verification`; records are fictional. Earlier placeholder/no-map statements below are historical. Geocoding, hosted identity/storage, subscriptions, and municipal integration remain outside this change.

## Anthropic follow-up

After the baseline below, an Anthropic Messages adapter was added for `claude-sonnet-4-6` with a fixed HTTPS endpoint, structured JSON output, cancellation, bounded response reads, and sanitized errors. The user-provided key is now configured in ignored `.env.local`, never committed. The updated production server is running locally on port 3000 in provider mode. The engine still allows manual reporting on provider failure.

Photo-context verification (2026-09-12):

- `npm run verify` passed: strict typecheck, all 86 tests across five files, and production build.
- `node scripts/verify-provider.mjs --live --with-image` passed through local sign-in, synthetic image upload, preparation queue, real Anthropic Messages, strict output validation, and persisted terminal read. Result: `succeeded`, provider `anthropic`, model `claude-sonnet-4-6`, one image, one attempt, 13,762 ms engine latency, category `trees`, no error. This created a private test attachment/preparation, not a published issue.
- Offline checks assert actual image blocks, JPEG dimensions and metadata removal, caption ordering, no base64 in persisted/public preparation records, and rejection of missing/foreign/public-but-foreign/duplicate/excessive photos and arbitrary URLs. Demo mode makes no provider request.
- `npm run smoke` passed against a separate port-3001 demo-mode server and isolated `.data/vision-verification` store: HFX-0145, two organizations, evidence, public/private boundaries, and lead-controlled resolution. The temporary server was stopped; port 3000 remains running. This avoided additional paid model requests.
- The report form sends its uploaded photo IDs and displays the Anthropic text/photo disclosure. This follow-up verified the API image journey, not a new browser-driven upload test. Earlier mobile browser evidence below belongs to the baseline UI.

One successful synthetic-image request verifies connectivity and the multimodal path, not real-world visual accuracy or production readiness. Earlier no-provider statements below describe the original baseline.

## Scope

Two mobile web experiences share persisted reports, resident evidence, follows, notifications, organization assignments, team milestones, public/staff updates, reopening, and lead-controlled resolution. The provider-neutral engine runs deterministic labeled suggestions or an explicit unconfigured failure. The map is a replaceable illustration.

No real map, LLM-provider connection, deployed Supabase/auth, municipal dispatch, or continuous worker GPS is claimed. Demo identity is restricted to loopback. This is not safe to expose publicly as a production service.

## Automated evidence

- Node 24.11.0, npm 11.6.1; pinned dependency installation completed.
- TypeScript strict check passed.
- 70 tests across engine, backend, and sensitive-location preparation checks passed (51 engine, 16 backend, 3 location/privacy).
- Engine: schemas, routing/area eligibility, related IDs, prompt-like text, malformed output, refusal, one transient retry, deadlines, cancellation/stale responses, unset provider, public-only summaries, latest-event budget regression.
- Backend: sessions/origins, role boundaries, SQLite restart, conflicts/idempotency, photo ownership and real metadata-stripping re-encode, public/staff separation, notifications, preparation ownership/failure, two-organization completion, guarded resolution/reopening, lead transfer, required assignment defaults, scoped inbox limits, and unsupported location rejection.
- The full `npm run verify` command passed: strict typecheck, all 70 tests, and production compilation/static generation.

The running-server `npm run smoke` passed against the production server (HFX-0148) using six separate cookie sessions. It creates a real local demo report, polls preparation, rejects foreign preparation access and resident authority access, joins two required organizations, assigns both teams, rejects a foreign worker update, adds evidence, publishes an update, checks follower delivery/private-note exclusion, blocks early resolution, completes both organizations, and resolves as lead. Each run leaves its labeled report for inspection.

## Browser evidence

Final retest after the next-step consistency and desktop layout fixes: production build passed; `npm run smoke` passed again as HFX-0149 (two organizations, demo preparation succeeded, one evidence item, resolved, extractive summary).

At a 390×844 viewport: public discovery/list, empty-description validation, description/accessibility input, manually confirmed location, anonymous draft preserved through demo sign-in, labeled demo preparation, editable review, and actual submission were exercised. A title edit survived reload before successful submission of HFX-0147. Its public detail showed the saved record; the evidence dialog saved a contribution and updated the shared timeline/evidence count. The document did not overflow horizontally at the checked report/public widths.

The browser test caught and corrected a draft hydration race, mobile account-link naming, and suggestion-overwrite risks. Independent source review also corrected summary recency budgeting, authority inbox filtering order, and unsupported-location handling. Uploaded report attachment metadata is retained in the tab draft; unuploaded files cannot be restored and the UI explains this.

The coordinator browser accepted HFX-0147, assigned Canopy 2, saved an on-site milestone, and published a public update. My work displayed the persisted task, and Updates displayed notifications; marking one read reduced the unread badge from four to three. No horizontal overflow was measured on the 360px authority detail, 430px updates, or 1440px public discovery view. These are focused checks, not a claim that every screen/state passed every viewport in the original design matrix. The desktop discovery panel is height-bounded so growing report lists do not push the placeholder content below the viewport.

## Remaining integration and QA boundaries

- Real map/tiles, attribution, and map camera/update behavior are now integrated as recorded above; geocoding remains unimplemented. See MAP_INTEGRATION.
- Anthropic text-and-image integration is verified above; other providers remain unimplemented. See ENGINE.
- Hosted identity/storage/database policies and durable background jobs require deployment work. Local SQLite stores one transactional domain snapshot and is not a multi-instance backend.
- No physical-phone, screen-reader, keyboard-visible mobile OS, production load, or broad accessibility certification is claimed. The single real-provider latency above is not a benchmark or guarantee. Snapshot polling is functional, but the three-second interval is not a measured service-level guarantee.
- Unuploaded photo files cannot survive navigation; uploaded report photo IDs do. Resident free text/photos can still reveal identifying details despite coordinate/metadata protection; do not use real personal data in the demo.
- The original DELIVERY matrix includes larger release gates and is not wholly marked complete by these checks.
