# Local prototype verification

Date: 2026-09-12. Branch: `feat/llm-engine`. This file records application evidence, not the older HTML design reference.

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

- Real map, tiles, geocoding, attribution, and map camera/update behavior belong to the map teammate; see MAP_INTEGRATION.
- Provider choice, credentials, and SDK adapter remain intentionally empty; see ENGINE.
- Hosted identity/storage/database policies and durable background jobs require deployment work. Local SQLite stores one transactional domain snapshot and is not a multi-instance backend.
- No physical-phone, screen-reader, keyboard-visible mobile OS, production load, real provider latency, or broad accessibility certification is claimed. Snapshot polling is functional, but the three-second interval is not a measured service-level guarantee.
- Unuploaded photo files cannot survive navigation; uploaded report photo IDs do. Resident free text/photos can still reveal identifying details despite coordinate/metadata protection; do not use real personal data in the demo.
- The original DELIVERY matrix includes larger release gates and is not wholly marked complete by these checks.
