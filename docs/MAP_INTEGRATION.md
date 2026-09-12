# Connected map integration

The MapLibre renderer from `feat/public-map` is integrated through `src/features/map/MapView.tsx`. Discovery, report location selection, and public/authority issue details use this component with the existing `IssueSummary` and `Location` contracts.

Retained from the map branch: MapLibre 6.9.0, cluster expansion/counts, category glyphs, lifecycle colors, reviewed urgent badges, selection rings, reduced-motion controls, configurable basemap/attribution, and the matching worker-copy script. The branch's alternate issue schema, bundled fixtures/source, disconnected sheet/actions, duplicate shell/styles, and older scaffolding were not imported.

The application keeps its routes, permissions, polling, single seed, Anthropic adapter, shared UI/tokens, pinned dependencies, Node 24 requirement, and verification commands.

```typescript
interface MapViewProps {
  issues: IssueSummary[];
  selectedIssueId?: string | null;
  onSelect?: (id: string) => void;
  location?: { latitude: number; longitude: number };
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
  compact?: boolean;
  onBoundsChange?: (bounds: readonly [number, number, number, number]) => void;
  cameraTarget?: { issueId: string; nonce: number } | null;
  authority?: boolean;
  transitStops?: TransitStop[];
  selectedStopId?: string | null;
  onStopSelect?: (id: string) => void;
  stopCameraTarget?: { latitude: number; longitude: number; nonce: number } | null;
  showAreas?: boolean;
  demoTransit?: DemoTransitDisplay;
}
```

Types are exported from `src/contracts/index.ts`. All three consumers use the shared `MapView` export.

`DemoTransitDisplay` is a renderer-only prop defined in `demoTransitLayer.ts`: scenario, play state, reset key, selected vehicle ID, and selection callback. It adds disposable route layers and keyboard-accessible moving bus markers. The transit presentation hides issue layers and real stop boards, keeps a persistent simulated label, and defaults to paused for reduced motion. See [TRANSIT](TRANSIT.md).

Transit types are in `src/contracts/transit.ts`. Public discovery uses `DailyNearby`: a larger map and Problems/Transit panel, with independent stop/area toggles, explicit map-area search, saved stops, and a metric scale. Stop selection opens the board; issue selection keeps the existing response journey. Staff discovery retains its work-first inbox. Transit stops use harbour-blue bus symbols; issue glyphs retain lifecycle colors.

Open issues with a positive `impactRadiusMeters` render 64-segment geodesic polygons in metres around their public point. Ochre fill and dashed outline identify an unverified reported area; the radius is shown in the list/detail. The privacy halo remains a separate approximate-location indicator. Filtering and polling update both issue markers and polygons without recentering. Zero/absent estimates and resolved issues produce no polygons. Report location/review controls collect and retain the optional estimate.

- Render issue markers from `publicLocation`, never a private field. Public `locationPrecision=approximate` must stay visibly approximate.
- `onSelect` changes the selected issue ID; it does not create an issue or change status.
- In reporting mode, `onLocationChange` updates a draft only. The resident still reviews and sends the report.
- Render compact context in issue detail when `compact=true`.
- The app refreshes issue props from persisted data. Replace GeoJSON features by stable ID; do not reset camera/selection every refresh.
- Use `[longitude, latitude]` when converting the shared location object to GeoJSON.
- Preserve map attribution, list alternative, keyboard access, safe-area spacing, and bounds/filter behavior from DESIGN_SPEC.
- A worker assignment's issue location is not a worker GPS position. Do not fabricate a moving vehicle marker or ETA.
- `NEXT_PUBLIC_MAP_STYLE_URL` defaults to `https://tiles.openfreemap.org/styles/positron`. Default attribution credits OpenFreeMap and OpenStreetMap contributors; a custom style may provide `NEXT_PUBLIC_MAP_ATTRIBUTION`. These are public build-time settings, never private credentials. Browser tile requests do not send report text or attachments.

The browser reads persisted `/api/v1/issues` through the existing three-second polling hook. Category/text filters affect map and list. “Search this area” explicitly applies `west,south,east,north` map bounds to the backend query; “Show all areas” removes the bound. The existing limit is 200 records per response. “Show on map” explicitly recenters; marker selection links to the existing issue response. Clusters expand on tap.

The report picker supports map taps, coordinate fields, and one explicit device-location request. It changes only the draft and preserves the existing confirmation and Halifax-area validation. Compact details plot public coordinates even for authorized staff; approximate locations have a halo and explanation. A halo is an area indicator, not a measured accuracy radius.

The renderer loads only in the browser, resizes with its container, and disposes its map, observers, listeners, and animations. Loading/tile failure preserves the issue list and coordinate inputs and offers retry. A source-free testing style is rejected as a basemap.

`npm run dev` and `npm run build` copy the pinned MapLibre worker and shared bundle into ignored `public/maplibre/`; serve those generated assets with the production build. Geocoding, hosted authentication/storage, municipal dispatch, and worker GPS remain outside this integration. See `VERIFICATION.md` for evidence and QA boundaries.
