# Mobile product design specification

Baseline: 1.0 | 2026-09-12 | Design owner: Builder A; review: quality lead

Companions: [visual reference](design/reference.html), [tokens](design/tokens.json), [product](PRODUCT.md), [system contracts](SYSTEM_CONTRACTS.md).

## Design direction: harbour field guide

OpenHFX should feel like a clear, capable local service you can use outdoors with one hand. Halifax's water, streets, parks, and practical wayfinding inform the palette and spatial layout. The memorable element is the living map with an attached issue sheet. Everything around it is restrained.

Use cool paper surfaces, deep harbour blue for actions, sea-glass water, quiet green park areas, and warm amber only for work needing attention. Information is mostly left aligned. Short task headings and useful status language carry the interface; there is no marketing hero inside either app.

### Design alternatives considered

| Approach | Strength | Decision |
| --- | --- | --- |
| Map-first public experience with anchored sheet | Makes place and nearby activity immediately understandable | Selected for residents |
| Work queue with compact geographic context | Prioritizes responsibility and next actions | Selected for authorities |
| Social feed with map as a separate destination | Familiar contribution model, but buries geography and ownership | Rejected as primary navigation |

Review against the brief: an identical dashboard for both roles would hide their different jobs. Identical rounded cards would also flatten the hierarchy. The selected direction uses one main map sheet, divided evidence/timeline rows, and assignment panels only where each represents a distinct unit of work.

## Visual system

### Core palette

| Token | Value | Role |
| --- | --- | --- |
| Paper | `#F4F7F8` | App background |
| Surface | `#FFFFFF` | Sheets, fields, primary content |
| Ink | `#142E3A` | Headings and body |
| Harbour | `#145E78` | Primary controls, selected state |
| Sea glass | `#C9E2E7` | Map water and secondary illustration |
| Ochre | `#A15C08` | Attention text and priority markers |

Supporting colors and exact values live in tokens.json. Use muted ink for secondary text, a sufficiently contrasting stroke for control boundaries, subtle separators for noninteractive rows, dark green for resolution, and deep red for explicit errors. Status uses icon plus text; color alone never carries meaning.

Primary button: white text on harbour. Secondary: harbour text on white with a visible control border. Never put white text on sea glass. Priority should occupy a small label/marker, not tint an entire screen red.

### Type

Use **Public Sans**, self-hosted WOFF2 at implementation, weights 400/500/600/700. Its straightforward civic voice fits reporting and field work. The offline visual reference uses the local system sans stack so it has no font-network dependency; production must load the specified family before final screenshots.

| Role | Size / line height | Weight |
| --- | --- | --- |
| Screen title | 28 / 34 px | 700 |
| Issue title | 24 / 30 px | 700 |
| Section title | 18 / 24 px | 600 |
| Body and inputs | 16 / 24 px | 400 |
| Controls | 16 / 20 px | 600 |
| Metadata | 14 / 20 px | 400 |
| Compact map label | 12 / 16 px | 500 |

Use sentence case. Do not use tracked uppercase labels, multiple display fonts, ornamental subtitles, or code-style metadata. Wrap titles; do not truncate the only description of an issue. Desktop reading lines stay below 72 characters.

### Geometry and controls

- Base spacing: 4 px. Main increments: 8, 12, 16, 20, 24, 32, 40.
- Phone side inset: 20 px; compact 360 px screens may use 16 px. Forms span available width.
- Input/button height: at least 48 px. Icon button target: 48 x 48 px; visible icon: 20-24 px.
- Radii: inputs/buttons 12 px; assignment panels 16 px; main map sheet top corners 24 px. Compact status labels use a pill shape.
- Use 1 px dividers for rows. Use a shadow only where the map sheet or floating control overlaps content.
- Focus: 3 px harbour outline with 3 px separation; never remove without replacement.
- Use one consistent Lucide icon family in the app. Icons supplement visible text or have accessible names.
- Default to light mode for the judged release. A second theme requires the same full contrast/state review and is outside the core build.

### Motion

Control feedback: 120 ms. Sheet transition: 220 ms. Selected-map-marker emphasis: one 300 ms ring on a user selection or newly received visible update. No continuous pulses, bouncing pins, animated background gradients, or autonomous camera movement.

Respect reduced motion: remove marker rings and use immediate or opacity-only state changes. Sheet drag always has Expand/Collapse buttons. An event may update text without moving focus or scroll position.

## Responsive shell

Design at 390 x 844 CSS pixels. Verify 360 x 800, 430 x 932, a short landscape viewport, and 1440 x 900 desktop.

- Phone: single column, persistent 64 px bottom navigation plus `env(safe-area-inset-bottom)`, 56 px app header plus top safe area. Browser chrome is outside these measurements. Use dynamic viewport units and content scrolling; do not lock whole pages to a fixed height.
- Tablet 768-1023 px: wider single-column forms capped at 560 px; map with a 360 px side panel when space allows.
- Desktop 1024+ px: map and 400 px issue/work panel side by side. Forms remain at most 560 px; do not stretch mobile cards across the screen.
- Account/profile is in the header. Notifications are inside Following (public) and Updates (authority), with a meaningful unread indicator.
- When the keyboard is open, keep the focused input and relevant next action visible; the bottom navigation may hide. The form remains scrollable.

## Navigation and screen inventory

| ID | Route | Primary job | Main action |
| --- | --- | --- | --- |
| P01 | `/public` | Understand nearby problems on map/list | Report a problem |
| P02 | `/public/report` | Describe, locate, review, submit | Continue, then Send report |
| P03 | `/public/issues/[id]` | Follow one issue and contribute | Add evidence / Follow issue |
| P04 | `/public/following` | Read followed issues and notifications | Open update |
| A00 | `/authority/sign-in` | Enter a provisioned organization account | Sign in |
| A01 | `/authority` | Triage relevant or assigned work | Open issue |
| A02 | `/authority/issues/[id]` | Coordinate organizations and teams | Accept assignment / Update progress |
| A03 | `/authority/work` | Field worker's assigned jobs | Update my progress |
| A04 | `/authority/updates` | Cross-organization changes and requests | Open issue |

Public nav: Nearby, Report, Following. Authority nav: Inbox, My work, Updates. A01 has Relevant/Assigned filters; A03 is an individual's work, while A01 Assigned is organization-wide.

## P01: live nearby map

```text
┌────────────────────────────────┐
│ OpenHFX               Account  │
│ [ Search an area             ] │
│ [All] [Access] [Trees] [More]   │
│                                │
│         MAP + ISSUE MARKERS    │
│                      [Locate]  │
│  Connection / last sync        │
├────────────────────────────────┤
│ Nearby issues          [List]  │
│ Selected issue + current status│
│ Place · published next step    │
│ [      Report a problem      ] │
├────────────────────────────────┤
│ Nearby     Report    Following │
└────────────────────────────────┘
```

The map is the main surface. Show streets, parks, water, issue markers, and readable geography; mute unnecessary commercial labels. The initial demo view is the Halifax peninsula. A location permission prompt follows an explicit Locate action, never page load.

Marker fill communicates lifecycle, interior icon communicates category, and an outer ring communicates selection. A separate small priority badge is available for reviewed urgent work. Unreviewed urgency is not rendered as confirmed risk. Legend: Reported, Assigned, In progress, Resolved; Acknowledged uses Reported styling with its exact label in the detail.

Clusters display a count with at least a 48 px interactive target. Tapping zooms into the cluster with enough padding for the sheet. At overlapping coordinates, show a selectable list instead of stacking untappable targets. Keyboard/list selection offers the same issue access.

The sheet has compact, half, and expanded states: approximately 180 px, 45% viewport, and remaining safe viewport below header. Content determines a larger minimum where text scaling needs it. Marker selection preserves camera orientation and opens the compact issue preview; Open issue navigates to P03. Back restores prior viewport, filters, and selection.

Panning the map reveals “Search this area.” New data inside the active bounds updates existing markers, but does not change bounds or refilter the map until requested. Resolved issues leave the default open filter only after selection is closed, so an update cannot dismiss an issue being read.

Always offer List, Locate, and a compact legend. Keep map provider attribution visible above the bottom overlay. Use one tap to open a marker; do not require hover.

### Live states

| Condition | Visible behavior |
| --- | --- |
| Connecting | “Connecting to updates…”; usable fetched snapshot |
| Subscription ready and recent successful sync | “Connected”; accessible exact last-sync time |
| Event received | Patch/refetch affected issue; preserve camera/focus; optional “2 issues updated” action |
| Subscription lost, polling succeeds | “Updates every 15 seconds”; do not label live |
| No successful sync for 30 seconds | “Updates delayed. Last synced…” with Retry |
| Offline | “Offline. Showing saved results”; last-sync time remains visible |
| Tiles unavailable | Issue list remains usable; “Map unavailable. View nearby issues.” |
| Location denied | Manual area search and map pin selection remain usable |
| No matches | “No open issues in this area”; change filters or Report |

The reference labels this “Demo” because its updates are simulated. A real map requires an approved tile/style provider; the MapLibre library alone does not supply a production basemap.

## P02: reporting inputs

Use a short form, not a required chat. Preserve draft text across steps and sign-in. Keep draft data local until submitted; show a discard control and clear draft after confirmation.

1. **What is happening?** Required plain-language description (20-2,000 characters); optional up to three photos and a brief accessibility-impact field. Explain the photo limit next to the control.
2. **Where is it?** Required confirmed pin plus a human-readable place description. Choose location, search an area, or use device location explicitly. Dragging is optional; buttons/manual confirmation provide alternatives. Public/private precision rules apply before sending map data.
3. **Review your report.** Editable proposed title, category, summary, and suggested responsible organizations. Preserve the original text. Show at most three possible related issues with location/time; each offers Add to this issue or Keep my new report.
4. **Send report.** Confirm persistence first. Show issue ID, follow state, and “Awaiting authority review.” Routing suggestions are not acceptance receipts.

LLM processing uses actual stages with indeterminate progress, e.g. “Preparing your report…” followed by “Review suggested details.” Do not use fabricated percentages or publish model reasoning. After 8 seconds show “You can send the report while suggestions finish.” After a configured timeout/failure, show “Suggestions unavailable. Your report can still be sent.”

Photo behavior: JPEG/PNG/WebP, 10 MB per photo, three per contribution. Preview, remove, per-file upload status, explicit retry. HEIC/unsupported types get a clear format message. A failed photo never disappears silently; allow retry or explicit removal before sending. Strip location metadata server-side and protect originals before publication.

Sign-in should return residents to the review step with text intact. Prevent repeated taps while saving; use an idempotency key, and recover uncertain submissions by lookup before creating another issue.

## P03: shared issue and public evidence

Order: category/place, title, lifecycle status, short location map, published next step, response teams, public timeline, evidence contributions. Place Follow in the header region and Add evidence as a reachable bottom action. Status is a compact fact; the next step is the key explanatory content.

Response section example: “2 organizations involved” with Harbour Parks / Inspection complete and Street Response / On site. Public users see organization names and deliberately published progress; no worker names, internal blockers, or continuous locations.

Timeline rows show actor organization, concrete action, time, and optional photo. Merge only visually adjacent duplicate events, never erase underlying records. Read More can expand long descriptions without navigating away.

Add evidence opens a text/photo sheet. Confirm success with “Evidence added” and show the new contribution once. New evidence does not automatically change lifecycle status. A resolved issue can accept a reopening request with a reason; a separate later occurrence is a linked new issue.

## A00/A01: authority entry and inbox

Authority sign-in identifies the organization and membership. Provide seeded demo accounts through the demo harness, never a public “Become an authority” role toggle.

A01 opens with organization name and an Inbox title. Relevant/Assigned segmented control, region/category filters, then a compact map/list switch. Work rows show title, place, reviewed priority (if any), current lead, age, and whether this organization has accepted work.

Keep rows calm: a category icon, two-line title, status label, and meaningful next-action text. Do not fill the initial view with aggregate counters or charts. Sort relevant items by reviewed urgency, then oldest unacknowledged within that band. Follow/evidence counts do not set priority.

## A02: collaborative response

Use the same issue title/location/status header as P03. The authority detail adds three sections: Overview, Response, Evidence. Internal notes are explicitly marked Staff only. The public timeline remains visible for context.

Response has one lead organization block and separate contributor assignment blocks. Each shows organization, assignment owner, purpose, required/optional flag, current task status, and next step. The user's organization has the primary action; another organization's block is read-only unless a permitted lead operation applies.

“Accept assignment” creates this organization's participation without overwriting other assignments. A second lead claim receives an explanatory conflict and offers to join instead. Lead transfer requires incoming acceptance; record both actors.

Publishing uses explicit audience choices: Public update or Staff note. Show audience directly above the compose field and on the final action, e.g. Publish public update. Never infer audience from a hidden preference.

Resolution dialog lists unfinished required assignments. Block resolution with an actionable reason until they complete or the lead explicitly releases the requirement with a public explanation. After success, the map, thread, and follower notices update from the same recorded event.

## A03: agent / field-team tracking

In product copy use **Teams**, **My work**, and **Work progress**, not “agents.” A coordinator assigns a team/worker from their own organization. A worker sees only their permitted jobs.

Each job shows purpose, issue location, assigned owner/team, current milestone, last reported time, and next action. Use a compact labeled progress rail, not a GPS route.

| Current milestone | Primary action | Result |
| --- | --- | --- |
| Assigned | Mark en route | Record en_route with actor/time |
| En route | Mark on site | Record on_site; no inferred coordinate |
| On site | Start work | Record working |
| Working | Complete my task | Require result note; photo optional |
| Any unfinished stage | Report a blocker | Reason required; show blocked and next action |
| Blocked | Resume work | Restore prior active stage with a note |

Authorized users can skip a milestone by choosing an explicit progress update with a note, e.g. already on site. A task marked complete does not automatically complete the organization assignment or whole issue; a coordinator confirms their assignment outcome.

Latest progress older than 30 minutes reads “Last reported 35 min ago,” not “Live team location.” The authority map may mark the assignment's issue location with a team badge labeled “Assigned here.” It must never represent that pin as the worker's current physical position.

## P04/A04: notifications

Group updates by issue. Each row includes what changed, who published it, time, and unread state. Open lands at the corresponding timeline event; Mark read persists. Public notifications include public events only. Staff notes notify eligible staff only. No self-notification for the action's author.

## Shared states and copy

| State | Copy / response |
| --- | --- |
| Save failure | “Your update wasn't saved. Your text is still here.” / Retry |
| Concurrent change | “This issue changed while you were editing.” / Review latest; preserve draft |
| No authority match | “Awaiting assignment” / report remains visible |
| Permission changed | “Your access changed. Refresh to continue.” / preserve nonsensitive draft |
| Empty assigned work | “No work assigned to you” / View organization inbox |
| Location unknown | “Choose a location” / search or pin selection |
| New public update | “Street Response is now on site.” / only after publication |

## Accessibility and quality floor

Target WCAG 2.2 AA. Normal text needs 4.5:1 contrast; large text 3:1. Interactive boundaries and meaningful icons need appropriate non-text contrast. Our 48 px touch-target design is stricter than WCAG 2.2 AA's 24 px minimum with exceptions. See [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Use visible labels, inline linked errors, semantic buttons, selected-state names, and keyboard focus management. Modal sheets trap focus and restore it on close. Persistent map panels are nonmodal and do not trap focus. Photo evidence has an editable description. Announce save results and batched updates politely, not every map marker change.

At 200% text zoom, content must reflow without losing actions. At 360 px there is no page-level horizontal scrolling. Prefer maintained accessible primitives (Radix Dialog/AlertDialog/Popover) over custom modal behavior. Keep status names consistent with contracts.

## Design acceptance

Before calling the prototype polished, capture the four central screens, an open keyboard form, an evidence error, an offline map, and an authority conflict at the required phone widths. Check hierarchy, clipped content, focus, one-handed actions, and the connected scenario in [DELIVERY](DELIVERY.md).

The supplied visual reference is the visual baseline and a simulation of shared state. Its schematic map and system font are deliberate reference limitations, not substitutes for production geography, connected data, or the specified font.
