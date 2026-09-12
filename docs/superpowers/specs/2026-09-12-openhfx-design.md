# Historical brainstorming: OpenHFX mobile web product design

Date: 2026-09-12

Status: Superseded by the version 1.0 project baseline. This file preserves the initial conversation only. Do not implement from it.

Current sources: [product](../../PRODUCT.md), [design specification](../../DESIGN_SPEC.md), [system contracts](../../SYSTEM_CONTRACTS.md), [team agreement](../../TEAM.md), and [delivery checklist](../../DELIVERY.md).

Changes since this draft: the live map is core scope; agent tracking means authority teams/field workers and their work progress; the shared schema now includes teams and work tasks. Current documents take precedence over every proposal below.

## Product purpose

Make it easy to report a local problem, connect it with the authorities able to address it, and keep everyone informed as work progresses.

The hackathon demonstration should show a complete report-to-resolution journey involving multiple residents and multiple authorities.

## Confirmed requirements

- Two mobile web experiences in one shared codebase: general public and authorities.
- Authorities sign in and see updates about issues relevant to their responsibilities.
- Multiple authorities can work on the same issue.
- Residents can contribute additional details and evidence to existing issues.
- The engine structures reports and assists with categories, actionable next steps, and progress communication.
- General reporting is the core scope. Recurring driveway obstructions and tree concerns use the same foundation.

## Proposed application structure

Use one responsive application with separate `/public` and `/authority` entry points, a shared backend, and a shared database. Each experience has its own navigation and permitted actions. Shared data keeps reports, assignments, and updates consistent across both experiences.

Separate web deployments could be added later. Maintaining separate codebases would add coordination and integration work for the hackathon without changing the proposed user experience.

### Public experience

Primary navigation: Nearby, Report, Following.

1. Describe a problem, choose its location, and optionally attach photos.
2. Review an editable summary and suggested category. Ask for clarification only when information required for routing is missing.
3. See potentially related issues. Join an existing issue or submit a new report; similarity alone never silently discards a report.
4. Open the issue page to see its public timeline, current status, participating authorities, and published next step.
5. Follow an issue, add details or evidence, and receive notifications about published updates.

The report must remain submittable if AI processing is unavailable. Show its classification as pending review.

Browsing public issues does not require signing in. Proposed default: residents sign in to submit, contribute, or follow, so contributions have an owner and notification destination.

### Authority experience

Primary navigation: Relevant, Assigned, Updates.

1. Sign in through an organization membership with defined responsibilities and service areas.
2. See reports matching the organization's categories and geographic coverage.
3. Review the report, evidence, routing suggestions, and existing authority participation.
4. Accept a role in the issue, assign an internal owner, or refer it to another eligible organization.
5. Request information, publish progress, and mark the organization's own work complete.

Relevant means suggested for review. An issue becomes acknowledged only when an authority actually acknowledges it.

For the hackathon, use seeded demonstration organizations and accounts. A public account cannot grant itself authority privileges. Real organization onboarding and external service integrations require subsequent implementation.

## One issue, multiple participants

An issue owns the shared description, location, category, public status, timeline, and followers.

Each participating authority has its own assignment with an owner, role, next step, and work status. Assignments do not duplicate the original issue.

Proposed default: one lead organization coordinates overall progress, while contributing organizations manage their own assignments. An accepted lead transfer is recorded in the timeline.

Example: a reported branch obstructing a road can have an inspection assignment for one organization and a road-access assignment for another. Both update the same issue; residents can add a newer photo.

### Status rules

Issue lifecycle: Reported -> Acknowledged -> Assigned -> In progress -> Resolved.

- Reported: the application has saved the report.
- Acknowledged: an authority has reviewed and acknowledged it.
- Assigned: a lead organization has accepted responsibility and an owner is recorded.
- In progress: work has started on an accepted assignment.
- Resolved: the lead records a resolution after all required assignments are complete or explicitly marked unnecessary with a reason.

Needs information is a visible condition on an issue or assignment, rather than a replacement for its lifecycle status.

Assignment lifecycle: Accepted -> In progress -> Complete. An assignment can also be withdrawn with a recorded reason.

Residents can request reopening with new evidence. The lead confirms reopening, returning the issue to In progress and recording the decision. A later, separate occurrence can instead become a new issue linked to the prior occurrence.

Completing one organization's assignment never automatically resolves the whole issue. Conflicting concurrent edits must be detected and refreshed rather than silently overwriting a newer status.

## Evidence and communication

- Public contributions include text and photos with author and timestamp.
- Contributions append to the issue; residents cannot overwrite another person's evidence or authority updates.
- The initial release supports photos rather than arbitrary files or video.
- Public updates and internal authority notes have explicit visibility. Only public updates appear in resident timelines and notifications.
- Reporter contact information is available only to permitted staff. Public location detail should avoid unnecessarily exposing private residences.
- Staff can moderate a contribution with a recorded reason.
- Every status change records its actor and time. AI summaries retain references to the underlying public updates.

## Engine responsibilities

The LLM proposes a concise title, summary, category, clarification questions, possible related issues, and next steps.

Routing uses an application-maintained directory of organizations, service areas, and responsibilities. The engine selects from this directory; it does not invent authorities or contact details. Unmatched reports remain visibly unassigned for review.

Authorities review suggested priority and routing. Resident content is treated as report data, never as instructions authorizing tools or changing permissions.

New published authority events can trigger a resident-friendly summary and in-app notifications for followers. The application stores the underlying event before any optional summary generation.

The engine cannot claim an authority was contacted, an inspection was scheduled, or work was completed without the corresponding recorded event. External email, emergency dispatch, and municipal system submission are outside the initial demonstration.

## Initial data boundaries

| Record | Purpose |
| --- | --- |
| User | Identity and resident account |
| Organization | Responsibilities and geographic coverage |
| Membership | Verified authority access and organization role |
| Issue | Canonical report, location, category, lead, and public status |
| Assignment | One authority's responsibility and progress on an issue |
| Contribution | Resident detail or evidence attached to an issue |
| Attachment | Stored photo with owner and access rules |
| Timeline event | Actor, timestamp, event type, content, and visibility |
| Follow | Resident subscription to an issue |
| Notification | Recipient, originating public event, and read state |
| Issue relation | Suggested duplicate or separately recorded recurrence |

Permissions are enforced by the backend, not only by hiding controls in the interface.

## Hackathon scope

Build one working vertical flow first: resident submits -> authority sees relevant report -> two authorities accept assignments -> another resident adds evidence -> authorities publish updates -> followers see notifications -> lead resolves after required work completes.

Include responsive mobile layouts, persistent data, basic sign-in, photo upload, organization matching, assignment collaboration, a public timeline, and in-app notifications. Refresh or bounded polling is sufficient for the first demo; native push is not required.

Use text-based issue cards and a location picker before investing in a complex map. Keep a clearly labeled seeded demonstration dataset for a repeatable presentation.

Recurring obstructions add linked occurrences and a history view. Tree concerns add a category and an inspection workflow. Predicting tree failure is outside this release.

## Team division

- Builder 1: public screens, reporting, evidence contributions, following, and resident notifications.
- Builder 2: shared backend, authority access, matching, assignments, and engine integration.
- Teammate 3: example reports, organization responsibility directory, demonstration data, and scenario validation.
- Teammate 4: end-to-end testing, mobile usability checks, demo narrative, and pitch.

Agree on the shared records and API contracts before parallel implementation. Use short feature branches and keep shared schema changes coordinated.

## Acceptance checks

1. A submitted report survives refresh and appears in the appropriate authority inbox.
2. Two different authority organizations can accept and update separate assignments on one issue.
3. A second resident can add evidence without creating another issue or replacing existing evidence.
4. A public update reaches issue followers once and appears in the shared timeline.
5. Internal notes and reporter contact information never appear in public API responses.
6. An ordinary public account cannot perform authority actions.
7. Completing one assignment leaves the issue open while another required assignment is unfinished.
8. AI failure does not prevent submission or erase a recorded authority update.
9. Concurrent updates do not silently erase another authority's changes.
10. Both experiences work on narrow phone viewports with usable forms, navigation, and evidence previews.

## Review and next step

The team should review the proposed ownership and status rules before implementation. After review, choose the implementation stack and create a sequenced build plan with setup commands, shared contracts, and verification steps.
