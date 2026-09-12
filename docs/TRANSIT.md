# Daily transit and reported problem areas

User-approved follow-up, 2026-09-12. The public map combines local demo problems with real Halifax Transit open data. The agency has not endorsed OpenHFX. Authority workflows, role checks, and issue statuses are unchanged.

## Data and endpoints

- Static catalogue: [official GTFS archive](https://gtfs.halifax.ca/static/google_transit.zip). Parse stops, routes and trips only; stop-times and shapes are not loaded.
- Predictions: [official TripUpdates](https://gtfs.halifax.ca/realtime/TripUpdate/TripUpdates.pb).
- Notices: [official Alerts](https://gtfs.halifax.ca/realtime/Alert/Alerts.pb).
- [GTFS Realtime reference](https://gtfs.org/documentation/realtime/reference/) and [Node bindings](https://gtfs.org/documentation/realtime/language-bindings/nodejs/) define decoding semantics.
- Contains information licenced under the [Open Government Licence — Halifax](https://data-hrm.hub.arcgis.com/pages/open-data-licence). The UI includes this attribution and an official schedule link.

`GET /api/v1/transit?latitude=&longitude=` returns `{data:TransitNearby}` with at most 30 closest stops within 3 km of the chosen map centre, straight-line `distanceMeters`, catalogue load timestamp, source, and stale flag. Missing/invalid coordinates return 400.

`GET /api/v1/transit/stops/:id` returns `{data:TransitBoard}`. Its stop, up to eight future bus departures within 90 minutes, relevant notices, independent trip/alert timestamps, `stale`, and `alertsStale` fields are defined in `src/contracts/transit.ts`. Unknown stops return 404. Provider failures use the normal safe 503 envelope or explicitly stale cached data.

No credentials are required. Browser requests stay same-origin; server fetches only fixed HTTPS feed URLs with redirects disabled. Static download limit is 12 MB, with 20 MB total extracted selected files; realtime limit is 5 MB. Deadlines are 15 seconds static / 8 seconds realtime. There are no vehicle-location, dispatch, or geolocation-history writes.

## Freshness and interpretation

Static cache: six hours; failure backoff: 30 seconds; stale catalogue ceiling: seven days. Realtime cache: 25 seconds with single-flight refresh; browser board polling: 30 seconds while visible/online. Nearby catalogue polling is five minutes. Trips older than 120 seconds are not predictions; the browser also expires their display after refresh failure or tab suspension. Alert freshness is independent; cached notices may survive up to 24 hours with an explicit stale label and active-period checks.

Only absolute, usable future departure times on bus routes are shown. Missing realtime data is not interpreted as on-time service or no scheduled service. Cancelled/deleted/skipped/no-data/no-pickup records do not become departure rows. Missing delay remains null. Halifax's modified-trip alias is joined by current trip identity so one bus does not appear twice; distinct trip/frequency instances stay separate.

Active notices match their stop/route/agency/trip restrictions together. Route-only notices depend on observed realtime trips serving the stop; this is not a comprehensive scheduled-route alert index. There is no full timetable, ferry prediction board, journey planner, route-line layer, or moving bus tracking. Provider estimates can change. Users can open the official schedules even when a feed is unavailable.

## Daily interface

### Transit mode demonstration

The user requested simulated moving buses for the presentation. The **Transit mode · Demo** button opens a separate transit-only map with four animated vehicles, two illustrative route lines, and six clickable demo stops. A persistent “Demo transit” map label and panel disclosure identify all of these as simulated. This mode does not display real predictions or imply GPS tracking. Exit restores the existing neighbourhood/real-transit experience.

The single scenario is exported from `src/server/app/seed.ts`, served publicly by `GET /api/v1/transit/demo` as `{data:DemoTransitScenario}`. It requires no upstream feed, identity, or provider key and creates no records. Types live alongside the real transit contracts but remain explicitly `isDemo:true`. Fixture IDs use `D`/`demo-` names and cannot become real stop-board requests through this UI.

Movement follows the illustrative paths out and back continuously at a deterministic distance-weighted pace. Play/pause preserves position; Reset restores initial offsets and route overview. Movement pauses while the page is hidden; reduced-motion preference starts playback paused. Vehicle buttons are keyboard accessible and open the same selected-bus state as the list. Animation runs only inside the map renderer and is disposed on exit/unmount. Basemap tiles still require their ordinary network connection.

Public discovery has Problems and Transit panels. Stop markers and a searchable nearby list open the same board. Service notices precede departures. Up to eight saved stops persist only in this browser's local storage; storage failures are visible. Saved stops contain public stop metadata, not resident or worker locations. An explicit Locate action is the only device-location request. Search this area uses the chosen map bounds for problems and their midpoint for nearby stops.

Problem areas are user-entered estimated radii (0–500 m) in the existing reporting form and contract. Zero means unknown. The map draws metre-scaled shaded polygons around public coordinates only, with a distinct legend explanation and list/detail radius. Resolved issues are unshaded. Seed radii are fictional examples; legacy reports without a radius are never silently assigned one. These are not surveyed or verified closure/hazard boundaries.

Offline regression coverage includes parsing, join identity, cancellation, selector conjunctions, response bounds, cache/backoff, failure states, radius validation/persistence, private-coordinate exclusion, metre geometry, resolved/unknown omission, and client-side prediction expiry. Live checks are recorded separately in [VERIFICATION](VERIFICATION.md).
