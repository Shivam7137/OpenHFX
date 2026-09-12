'use client';

import { useCallback, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { Crosshair, RefreshCw, TriangleAlert } from 'lucide-react';
import type { BoundingBox, PublicIssue } from '@/contracts';
import { HALIFAX_PENINSULA_BBOX } from './mapConfig';
import { IS_DEMO_SOURCE, fetchPublicIssuesInBounds } from './issueSource';
import { CategoryFilters, type CategoryFilter } from './CategoryFilters';
import { IssueSheet, type SheetState, type SheetView } from './IssueSheet';
import { MapLegend } from './MapLegend';
import type { CameraTarget } from './MapCanvas';

// MapLibre needs a real document, so the canvas never renders on the server.
const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => <div className="map-canvas map-canvas-loading">Loading the map…</div>,
});

type LocateState = 'idle' | 'locating' | 'denied' | 'unavailable';
type LocateTarget = { latitude: number; longitude: number; nonce: number } | null;

const SHEET_TARGETS: Record<SheetState, (viewportHeight: number) => number> = {
  compact: () => 180,
  half: (viewportHeight) => Math.round(viewportHeight * 0.45),
  expanded: (viewportHeight) => Math.round(viewportHeight * 0.72),
};

// Header, filter row, bottom navigation, and a last 40 px of map. On a normal
// phone this never binds; on a short screen it stops the sheet covering the map
// it belongs to.
const RESERVED_HEIGHT = 232;
const MIN_SHEET_HEIGHT = 140;

const sheetHeight = (state: SheetState, viewportHeight: number) =>
  Math.min(SHEET_TARGETS[state](viewportHeight), Math.max(viewportHeight - RESERVED_HEIGHT, MIN_SHEET_HEIGHT));

const SERVER_VIEWPORT_HEIGHT = 844;

const subscribeToViewport = (onChange: () => void) => {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
};

/** True when the visible area has moved outside what the last query covered. */
const extendsBeyond = (current: BoundingBox, queried: BoundingBox) => {
  const [west, south, east, north] = current;
  const [queriedWest, queriedSouth, queriedEast, queriedNorth] = queried;
  return west < queriedWest || south < queriedSouth || east > queriedEast || north > queriedNorth;
};

export function NearbyMap({ initialIssues }: { initialIssues: PublicIssue[] }) {
  const [issues, setIssues] = useState<PublicIssue[]>(initialIssues);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sheetState, setSheetState] = useState<SheetState>('compact');
  const [view, setView] = useState<SheetView>('map');
  const [mapAvailable, setMapAvailable] = useState(true);
  const [canSearchArea, setCanSearchArea] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget>(null);
  const [locateTarget, setLocateTarget] = useState<LocateTarget>(null);
  const [locateState, setLocateState] = useState<LocateState>('idle');

  const viewportHeight = useSyncExternalStore(
    subscribeToViewport,
    () => window.innerHeight,
    () => SERVER_VIEWPORT_HEIGHT,
  );
  const bottomInset = sheetHeight(sheetState, viewportHeight);

  const currentBoundsRef = useRef<BoundingBox>(HALIFAX_PENINSULA_BBOX);
  const queriedBoundsRef = useRef<BoundingBox>(HALIFAX_PENINSULA_BBOX);
  const hasOpeningBoundsRef = useRef(false);

  const loadIssues = useCallback(async (bbox: BoundingBox) => {
    const result = await fetchPublicIssuesInBounds(bbox);
    queriedBoundsRef.current = bbox;
    setIssues(result.items);
    setSyncedAt(result.syncedAt);
    setCanSearchArea(false);
  }, []);

  const selectedId = selectedIds.length === 1 ? (selectedIds[0] ?? null) : null;

  // A resolved issue stays visible while it is the one being read, so an update
  // cannot dismiss an issue mid-read (docs/DESIGN_SPEC.md, P01).
  const visibleIssues = useMemo(
    () =>
      issues.filter((issue) => {
        if (category !== 'all' && issue.category !== category) return false;
        if (issue.status === 'resolved' && !showResolved && issue.id !== selectedId) return false;
        return true;
      }),
    [issues, category, showResolved, selectedId],
  );

  const selectedIssue = useMemo(
    () => (selectedId ? (issues.find((issue) => issue.id === selectedId) ?? null) : null),
    [issues, selectedId],
  );

  const overlappingIssues = useMemo(
    () => (selectedIds.length > 1 ? issues.filter((issue) => selectedIds.includes(issue.id)) : []),
    [issues, selectedIds],
  );

  const handleMapSelect = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    if (ids.length > 0) setSheetState((current) => (current === 'compact' ? 'half' : current));
  }, []);

  const handleListSelect = useCallback((issueId: string) => {
    setSelectedIds([issueId]);
    setSheetState((current) => (current === 'compact' ? 'half' : current));
    setCameraTarget({ issueId, nonce: Date.now() });
  }, []);

  const handleMoved = useCallback(
    (bbox: BoundingBox) => {
      currentBoundsRef.current = bbox;

      // The first report is the map's own opening view rather than a pan, so it
      // refines the seeded query instead of prompting to search again.
      if (!hasOpeningBoundsRef.current) {
        hasOpeningBoundsRef.current = true;
        void loadIssues(bbox);
        return;
      }

      setCanSearchArea(extendsBeyond(bbox, queriedBoundsRef.current));
    },
    [loadIssues],
  );

  const handleLocate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocateState('unavailable');
      return;
    }
    setLocateState('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocateState('idle');
        setLocateTarget({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          nonce: Date.now(),
        });
      },
      (error) => setLocateState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }, []);

  const syncedLabel = syncedAt
    ? new Date(syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="nearby" style={{ '--sheet-height': `${bottomInset}px` } as CSSProperties}>
      <CategoryFilters
        value={category}
        showResolved={showResolved}
        onChange={setCategory}
        onShowResolvedChange={setShowResolved}
      />

      <div className="map-area">
        {mapAvailable ? (
          <MapCanvas
            issues={visibleIssues}
            selectedId={selectedId}
            cameraTarget={cameraTarget}
            locateTarget={locateTarget}
            bottomInset={bottomInset}
            onSelect={handleMapSelect}
            onMoved={handleMoved}
            onReady={() => setMapAvailable(true)}
            onUnavailable={() => setMapAvailable(false)}
          />
        ) : (
          <div className="map-unavailable">
            <TriangleAlert size={20} aria-hidden />
            <p>Map unavailable. View nearby issues in the list below.</p>
          </div>
        )}

        <div className="map-hud">
          <div className="hud-actions">
            {canSearchArea && mapAvailable ? (
              <button type="button" className="floating-button" onClick={() => void loadIssues(currentBoundsRef.current)}>
                <RefreshCw size={18} aria-hidden />
                Search this area
              </button>
            ) : (
              <span />
            )}

            {mapAvailable ? (
              <button
                type="button"
                className="icon-button floating"
                onClick={handleLocate}
                disabled={locateState === 'locating'}
                aria-busy={locateState === 'locating'}
                aria-label="Show my location"
              >
                <Crosshair size={20} aria-hidden />
              </button>
            ) : null}
          </div>

          {mapAvailable ? <MapLegend /> : null}
          <p className="sync-line" role="status">
            {IS_DEMO_SOURCE
              ? `Demo data, not live.${syncedLabel ? ` Loaded ${syncedLabel}.` : ''}`
              : `Last synced ${syncedLabel ?? 'never'}.`}
          </p>
          {locateState === 'denied' ? (
            <p className="sync-line">Location permission denied. Search an area or choose a marker instead.</p>
          ) : null}
          {locateState === 'unavailable' ? (
            <p className="sync-line">Location unavailable. Search an area or choose a marker instead.</p>
          ) : null}
        </div>
      </div>

      <IssueSheet
        issues={visibleIssues}
        selectedIssue={selectedIssue}
        overlappingIssues={overlappingIssues}
        state={sheetState}
        view={view}
        mapAvailable={mapAvailable}
        onStateChange={setSheetState}
        onViewChange={setView}
        onSelect={handleListSelect}
        onClearSelection={() => setSelectedIds([])}
      />
    </div>
  );
}
