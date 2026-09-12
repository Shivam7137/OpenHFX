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

The repository contains documentation and a visual reference, not the application. Application paths in the contracts are planned. Do not assume packages, scripts, migrations, or hosted services already exist.
