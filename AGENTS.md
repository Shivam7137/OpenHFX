# OpenHFX contributor instructions

## Read first

Read `README.md`, `docs/PRODUCT.md`, and the task-relevant canonical documents linked there before coding. `docs/TEAM.md` defines ownership and change coordination. Check `git status` and preserve existing work.

## Command routing

- `/plan`: consult product/team guidance and relevant design/contracts; propose a bounded task with explicit acceptance criteria.
- `/exec`: use the accepted task, read its owned files and contracts, implement in scope, and verify the affected user journey.
- `/review`: inspect the diff against `docs/DELIVERY.md` and relevant design/contracts. Report evidence and actionable findings; do not silently implement changes.

Load only additional instructions relevant to the current command.

## Shared rules

- Keep one codebase and shared components for both mobile experiences.
- Use `docs/design/tokens.json` for visual values and `docs/SYSTEM_CONTRACTS.md` for shared names. Update canonical docs in the same change when changing a contract.
- Do not invent extra statuses, a second issue schema, another UI kit, or independent fixtures.
- Keep AI suggestions distinct from authority decisions; label demonstration events.
- Agent tracking means work progress. No continuous GPS collection or public worker locations without a new product decision.
- Enforce roles and visibility at the backend; hidden buttons are not authorization.
- Prefer minimal diffs. Flag an active code file of roughly 600+ lines before substantial edits.
- Keep secrets out of browser code, examples, fixtures, and committed environment files.
- Verify relevant mobile behavior and report gaps. The visual reference is not production functionality.
- Do not push, publish, contact authorities, or modify external services without user authorization.

## Current stage

Provider follow-up: Anthropic is now an implemented server-side adapter. Read `docs/ENGINE.md`; the original unset-provider baseline below is superseded for this adapter. Never read secrets into tool output, commit `.env.local`, or run paid live checks without user authorization. Keep offline tests independent of real keys.

The application implements a local Next.js prototype with the public-map work selectively integrated. Read `docs/IMPLEMENTATION.md` for its exact API and deliberate overrides of the hosted architecture, and `docs/MAP_INTEGRATION.md` for the shared `MapView` boundary. Shared types are in `src/contracts/index.ts`; the single fixture is in `src/server/app/seed.ts`. Run typecheck, tests, build, and the running-server smoke workflow before claiming integrated completion. Preserve explicit provider selection. SQLite/demo identity are not production authentication or hosted infrastructure.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
