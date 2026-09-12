# Visual reference review

Date: 2026-09-12

Artifact: [interactive reference](reference.html), [desktop capture](reference-desktop.png), [design specification](../DESIGN_SPEC.md).

## What was checked

The local reference was opened and operated in the Codex in-app browser. These checks concern the HTML/CSS/JavaScript design artifact only. The backend, actual map tiles, real LLM, authentication, and cross-session app behavior are not implemented or verified by this review.

| Check | Observed result |
| --- | --- |
| Progress simulation | Assigned -> en route -> on site -> working -> task/assignment completion -> lead resolution reflected across public and authority screens |
| Partial completion | Parks complete / streets working left all issue status labels at In progress |
| Both assignments complete | Issue stayed In progress until the lead-resolution step |
| Final resolution | Map marker styling and all three issue labels switched to Resolved |
| Offline simulation | Advance action preserved the snapshot and explained why progress could not advance |
| Evidence | Added demo evidence updated the shared timeline and authority count from 2 to 3 |
| Report review | Editable fixture title updated across map, authority, and public detail screens; no real submission claimed |
| Category filter | Access hid the tree marker/row and exposed access in the list; View all restored the main selection |
| Reset | Restored inputs, initial progress, evidence count, follow/filter state, and scroll positions |
| Browser diagnostics | No captured warning/error entries during the final inspected interaction session |
| Script | `node --check docs/design/reference.js` passed |
| Documents | All Markdown local file links resolved; token JSON parsed; no 600+ line text/code files |

## Responsive inspection

Measured the design board at widths 360, 390, 430, 1440, and 1760 CSS pixels. No page-level horizontal overflow was observed; embedded phones also had no internal horizontal overflow. The board changes from one column to two, then four. Its embedded phone widths include surrounding board margins, so this is not a claim that the future application has passed those device sizes.

The desktop capture uses the four-column breakpoint at 1760 x 1160, scrolled to the screen studies. The 390 x 844 board was also visually inspected. Long form/detail content scrolls inside the phone references, and the report action remains reachable through that scrolling.

## Measured color contrast

Ratios calculated from the canonical sRGB token values:

| Pair | Ratio | Target |
| --- | --- | --- |
| Ink on surface | 14.17:1 | 4.5:1 |
| Muted on paper | 5.54:1 | 4.5:1 |
| White on harbour | 7.24:1 | 4.5:1 |
| Harbour on harbour-soft | 6.28:1 | 4.5:1 |
| Ochre on ochre-soft | 4.64:1 | 4.5:1 |
| Success on success-soft | 6.14:1 | 4.5:1 |
| Control border on white | 3.25:1 | 3:1 |

This is a targeted token check, not a full WCAG audit. Full keyboard, screen reader, 200% text zoom, mobile software-keyboard, reduced-motion, and all component-state checks remain in [DELIVERY](../DELIVERY.md) for the actual app.

## Design critique and refinements

- Used a map-first public view and a work-first authority view, retaining common colors, issue headers, and control shapes.
- Avoided competing metric cards so the map, next action, and assignment ownership remain prominent.
- Adjusted the four-column breakpoint so narrow desktop windows show two usable phones rather than four compressed ones.
- Aligned issue-title sizing, header/navigation heights, and back-control targets with the shared tokens.
- Fixed category/list consistency and reset behavior found while operating the reference.
- Kept offline state, fictional geography, demo organizations, and simulated progress explicitly labeled.

## Intentional reference limits

The map is an original schematic illustration, not accurate navigation. Search, cluster count, account entry, and section-tab labels demonstrate layout without full application behavior. Navigation links move between study screens. Photos/evidence and report preparation use local illustrative state; no upload, provider call, persistent save, role enforcement, or external communication occurs. The timeline shows a compact latest-event example rather than a complete event history.

The reference uses system sans fonts for offline portability; the implementation specifies self-hosted Public Sans. Source markup and reviewed screenshots remain complementary: the written contracts govern behavior and access, and the screenshot communicates intended visual hierarchy.
