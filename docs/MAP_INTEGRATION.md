# Map teammate handoff

The application owns persisted reports, authority assignments, evidence, and updates. Replace only `src/features/map/MapPlaceholder.tsx` (and its module stylesheet) to connect the geographic UI. The current component is explicitly labeled as a placeholder and does not pretend its schematic drawing is a real map.

```typescript
interface MapPlaceholderProps {
  issues: IssueSummary[];
  selectedIssueId?: string | null;
  onSelect?: (id: string) => void;
  location?: { latitude: number; longitude: number };
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
  compact?: boolean;
}
```

Types are exported from `src/contracts/index.ts`. Preserve the named component export initially so the teammate's change can land independently of report/authority routes. Renaming it to MapView can be one coordinated follow-up.

- Render issue markers from `publicLocation`, never a private field. Public `locationPrecision=approximate` must stay visibly approximate.
- `onSelect` changes the selected issue ID; it does not create an issue or change status.
- In reporting mode, `onLocationChange` updates a draft only. The resident still reviews and sends the report.
- Render compact context in issue detail when `compact=true`.
- The app refreshes issue props from persisted data. Replace GeoJSON features by stable ID; do not reset camera/selection every refresh.
- Use `[longitude, latitude]` when converting the shared location object to GeoJSON.
- Preserve map attribution, list alternative, keyboard access, safe-area spacing, and bounds/filter behavior from DESIGN_SPEC.
- A worker assignment's issue location is not a worker GPS position. Do not fabricate a moving vehicle marker or ETA.
- Tile/style provider and any public browser key must be configured by the map team. No map dependency or credential has been selected on this branch.

The placeholder includes an explicit browser-location button and coordinate fields to keep the reporting workflow usable until the real picker is integrated. Reuse their role in the form even if their visual presentation changes.
