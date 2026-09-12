'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type PointLike,
} from 'maplibre-gl';
import type { IssueSummary, Location } from '@/contracts';
import type { TransitStop } from '@/contracts/transit';
import { addDailyLayers, updateDailyLayers, STOP_LAYER, AREA_LAYER } from './dailyLayers';
import { useDemoTransitLayer, type DemoTransitDisplay } from './demoTransitLayer';
import type { BoundingBox } from './geo';
import styles from './MapView.module.css';
import {
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS_PX,
  HALIFAX_PENINSULA,
  LAYER_IDS,
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
  MAP_WORKER_URL,
  SOURCE_ID,
  TAP_TOLERANCE_PX,
} from './mapConfig';
import { toIssueFeatureCollection } from './issueGeoJson';
import {
  CLUSTER_COUNT_IMAGE_PREFIX,
  PRIORITY_BADGE_IMAGE,
  STATUS_FILL,
  registerMarkerImages,
  resolveMissingImage,
} from './markerImages';
import { applyBrandOverrides } from './styleOverrides';
import tokens from '../../../docs/design/tokens.json';

export type CameraTarget = { issueId: string; nonce: number } | null;
export type LocateTarget = { latitude: number; longitude: number; nonce: number } | null;

type MapCanvasProps = {
  issues: IssueSummary[];
  selectedId: string | null;
  cameraTarget: CameraTarget;
  /** Set only after an explicit Locate action; the page never asks on load. */
  locateTarget: LocateTarget;
  /** Bottom overlay height in CSS pixels, so camera moves keep markers clear of the sheet. */
  bottomInset: number;
  onSelect: (issueIds: string[]) => void;
  onMoved: (bbox: BoundingBox) => void;
  onReady: () => void;
  onUnavailable: () => void;
  location?: Location;
  onLocationChange?: (location: Location) => void;
  compact?: boolean;
  transitStops?: TransitStop[];
  selectedStopId?: string | null;
  onStopSelect?: (id: string) => void;
  stopCameraTarget?: LocateTarget;
  showAreas?: boolean;
  demoTransit?: DemoTransitDisplay;
};

const STYLE_LOAD_TIMEOUT_MS = 12_000;

setWorkerUrl(MAP_WORKER_URL);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const readBounds = (map: MapLibreMap): BoundingBox => {
  const bounds = map.getBounds();
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
};

const statusColourExpression: ExpressionSpecification = [
  'match',
  ['get', 'status'],
  'reported',
  STATUS_FILL.reported,
  'acknowledged',
  STATUS_FILL.acknowledged,
  'assigned',
  STATUS_FILL.assigned,
  'in_progress',
  STATUS_FILL.in_progress,
  'resolved',
  STATUS_FILL.resolved,
  tokens.color.muted,
];

const categoryIconExpression: ExpressionSpecification = ['concat', 'category-', ['get', 'category']];
const clusterCountExpression: ExpressionSpecification = [
  'concat',
  CLUSTER_COUNT_IMAGE_PREFIX,
  ['get', 'point_count_abbreviated'],
];

export default function MapCanvas({
  issues,
  selectedId,
  cameraTarget,
  locateTarget,
  bottomInset,
  onSelect,
  onMoved,
  onReady,
  onUnavailable,
  location,
  onLocationChange,
  compact = false,
  transitStops = [], selectedStopId, onStopSelect, stopCameraTarget, showAreas = true, demoTransit,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const locateMarkerRef = useRef<Marker | null>(null);
  const draftMarkerRef = useRef<Marker | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Long-lived map listeners read the latest props and callbacks from here, so
  // setting up the map does not have to run again when either changes.
  const latestRef = useRef({ issues, bottomInset, onSelect, onMoved, onReady, onUnavailable, location, onLocationChange, selectedId, compact, transitStops, onStopSelect, showAreas });
  useEffect(() => {
    latestRef.current = { issues, bottomInset, onSelect, onMoved, onReady, onUnavailable, location, onLocationChange, selectedId, compact, transitStops, onStopSelect, showAreas };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: MapLibreMap;
    const initial = latestRef.current;
    const initialLocation = initial.location || (initial.compact ? initial.issues.find(issue => issue.id === initial.selectedId)?.publicLocation : undefined);
    try {
      map = new MapLibreMap({
        container,
        style: MAP_STYLE_URL,
        center: initialLocation ? [initialLocation.longitude, initialLocation.latitude] : HALIFAX_PENINSULA.center,
        zoom: initialLocation ? 15 : HALIFAX_PENINSULA.zoom,
        minZoom: HALIFAX_PENINSULA.minZoom,
        maxZoom: HALIFAX_PENINSULA.maxZoom,
        attributionControl: false,
        // The public map is a plan view; pitch and rotation add no information here.
        pitchWithRotate: false,
        dragRotate: false,
      });
    } catch {
      latestRef.current.onUnavailable();
      return;
    }

    mapRef.current = map;
    map.addControl(new AttributionControl({ compact: false, customAttribution: MAP_ATTRIBUTION }), 'bottom-left');
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-right');
    map.touchZoomRotate.disableRotation();

    const failureTimer = window.setTimeout(() => {
      if (!readyRef.current) latestRef.current.onUnavailable();
    }, STYLE_LOAD_TIMEOUT_MS);

    map.setMissingStyleImageResolver(id => { resolveMissingImage(map, id); });

    map.on('error', (event) => {
      // A style that never loads leaves no basemap; issue discovery falls back to the list.
      latestRef.current.onUnavailable();
      console.warn('Map rendering error:', event.error.message);
    });

    map.on('load', () => {
      // A source-free testing style must never be presented as geography.
      if (!Object.keys(map.getStyle().sources).length) {
        latestRef.current.onUnavailable();
        return;
      }
      readyRef.current = true;
      window.clearTimeout(failureTimer);
      applyBrandOverrides(map);
      registerMarkerImages(map);
      addDailyLayers(map, latestRef.current.showAreas ? latestRef.current.issues : [], latestRef.current.transitStops);

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toIssueFeatureCollection(latestRef.current.issues),
        cluster: true,
        clusterRadius: CLUSTER_RADIUS_PX,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
      });

      map.addLayer({
        id: LAYER_IDS.clusters,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': tokens.color.harbour,
          'circle-radius': 24,
          'circle-stroke-width': 3,
          'circle-stroke-color': tokens.color.surface,
        },
      });

      map.addLayer({
        id: LAYER_IDS.clusterCount,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'icon-image': clusterCountExpression,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      map.addLayer({
        id: LAYER_IDS.emphasisRing,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-color': 'rgba(0,0,0,0)',
          'circle-radius': 16,
          'circle-stroke-width': 3,
          'circle-stroke-color': tokens.color.harbour,
          'circle-stroke-opacity': 0,
        },
      });

      map.addLayer({
        id: LAYER_IDS.selectionRing,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-color': 'rgba(0,0,0,0)',
          'circle-radius': 20,
          'circle-stroke-width': 3,
          'circle-stroke-color': tokens.color.harbour,
        },
      });

      map.addLayer({
        id: 'public-issue-approximate-area',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'approximate'], true]],
        paint: { 'circle-radius': 27, 'circle-color': tokens.color.harbour, 'circle-opacity': 0.12,
          'circle-stroke-width': 1, 'circle-stroke-color': tokens.color.harbour, 'circle-stroke-opacity': 0.4 },
      });

      map.addLayer({
        id: LAYER_IDS.markers,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': statusColourExpression,
          'circle-radius': 14,
          'circle-stroke-width': ['case', ['==', ['get', 'status'], 'in_progress'], 4, 2],
          'circle-stroke-color': tokens.color.surface,
        },
      });

      map.addLayer({
        id: LAYER_IDS.categoryIcons,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': categoryIconExpression,
          'icon-size': 0.62,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      map.addLayer({
        id: LAYER_IDS.priorityBadges,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isUrgent'], true]],
        layout: {
          'icon-image': PRIORITY_BADGE_IMAGE,
          'icon-size': 0.7,
          'icon-offset': [14, -14],
          'icon-allow-overlap': true,
        },
      });

      setLoaded(true);
      latestRef.current.onReady();
      latestRef.current.onMoved(readBounds(map));
    });

    const pointerLayers = [LAYER_IDS.clusters, LAYER_IDS.markers, LAYER_IDS.categoryIcons, STOP_LAYER, AREA_LAYER];
    map.on('mousemove', (event) => {
      if (!readyRef.current) return;
      const hovered = map.queryRenderedFeatures(event.point, { layers: pointerLayers });
      map.getCanvas().style.cursor = hovered.length > 0 ? 'pointer' : '';
    });

    map.on('click', (event) => {
      if (!readyRef.current) return;
      if (latestRef.current.onLocationChange) {
        latestRef.current.onLocationChange({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
        return;
      }
      const tolerance = TAP_TOLERANCE_PX;
      const box: [PointLike, PointLike] = [
        [event.point.x - tolerance, event.point.y - tolerance],
        [event.point.x + tolerance, event.point.y + tolerance],
      ];

      const clusters = map.queryRenderedFeatures(box, { layers: [LAYER_IDS.clusters] });
      const cluster = clusters[0];
      if (cluster) {
        const clusterId = cluster.properties?.cluster_id as number | undefined;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        if (clusterId !== undefined && source) {
          void source.getClusterExpansionZoom(clusterId).then((zoom) => {
            if (mapRef.current !== map) return;
            const [longitude, latitude] = (cluster.geometry as GeoJSON.Point).coordinates as [number, number];
            map.easeTo({
              center: [longitude, latitude],
              zoom,
              padding: { top: 0, left: 0, right: 0, bottom: latestRef.current.bottomInset },
              duration: prefersReducedMotion() ? 0 : 300,
            });
          }).catch(() => { /* The source may have changed during a poll or unmount. */ });
        }
        return;
      }

      const markers = map.queryRenderedFeatures(box, { layers: [LAYER_IDS.markers] });
      if (!markers.length) {
        const stop = map.queryRenderedFeatures(box, { layers: [STOP_LAYER] })[0];
        if (stop) { latestRef.current.onStopSelect?.(String(stop.properties.id)); return; }
        markers.push(...map.queryRenderedFeatures(event.point, { layers: [AREA_LAYER] }));
      }
      const ids = Array.from(
        new Set(markers.map((feature: MapGeoJSONFeature) => String(feature.properties?.id ?? '')).filter(Boolean)),
      );
      latestRef.current.onSelect(ids);
    });

    map.on('moveend', () => {
      if (!readyRef.current) return;
      latestRef.current.onMoved(readBounds(map));
    });

    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container);

    return () => {
      window.clearTimeout(failureTimer);
      resize.disconnect();
      readyRef.current = false;
      mapRef.current = null;
      locateMarkerRef.current = null;
      draftMarkerRef.current = null;
      map.remove();
    };
  }, []);

  // Keep the rendered source in step with the filtered issue set.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(toIssueFeatureCollection(issues));
  }, [issues, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && loaded) updateDailyLayers(map, showAreas ? issues : [], transitStops, selectedStopId);
  }, [issues, transitStops, selectedStopId, showAreas, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && loaded && stopCameraTarget) map.easeTo({ center: [stopCameraTarget.longitude, stopCameraTarget.latitude], zoom: Math.max(map.getZoom(), 16), duration: prefersReducedMotion() ? 0 : tokens.motionMs.sheet });
  }, [stopCameraTarget, loaded]);

  // Selection ring, plus a single 300 ms emphasis ring unless motion is reduced.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    map.setFilter(LAYER_IDS.selectionRing, ['==', ['get', 'id'], selectedId ?? '']);
    map.setFilter(LAYER_IDS.emphasisRing, ['==', ['get', 'id'], selectedId ?? '']);
    if (!selectedId || prefersReducedMotion()) return;

    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.max(0, Math.min((now - start) / tokens.motionMs.marker, 1));
      map.setPaintProperty(LAYER_IDS.emphasisRing, 'circle-radius', 16 + progress * 18);
      map.setPaintProperty(LAYER_IDS.emphasisRing, 'circle-stroke-opacity', 1 - progress);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [selectedId, loaded]);

  // Camera moves are explicit: list selection recentres, a marker tap never does.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !cameraTarget) return;
    const issue = latestRef.current.issues.find((candidate) => candidate.id === cameraTarget.issueId);
    if (!issue) return;

    map.easeTo({
      center: [issue.publicLocation.longitude, issue.publicLocation.latitude],
      zoom: Math.max(map.getZoom(), CLUSTER_MAX_ZOOM + 1),
      padding: { top: 0, left: 0, right: 0, bottom: latestRef.current.bottomInset },
      duration: prefersReducedMotion() ? 0 : tokens.motionMs.sheet,
    });
  }, [cameraTarget, loaded]);

  // Locate only ever runs from the explicit control in the overlay.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !locateTarget) return;

    const position: [number, number] = [locateTarget.longitude, locateTarget.latitude];
    if (!locateMarkerRef.current) {
      const element = document.createElement('div');
      element.className = styles.locateMarker;
      element.setAttribute('aria-label', 'Your requested location');
      locateMarkerRef.current = new Marker({ element }).setLngLat(position).addTo(map);
    } else {
      locateMarkerRef.current.setLngLat(position);
    }

    map.easeTo({
      center: position,
      zoom: Math.max(map.getZoom(), 15),
      padding: { top: 0, left: 0, right: 0, bottom: latestRef.current.bottomInset },
      duration: prefersReducedMotion() ? 0 : tokens.motionMs.sheet,
    });
  }, [locateTarget, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !location) return;
    const position: [number, number] = [location.longitude, location.latitude];
    if (!draftMarkerRef.current) {
      const element = document.createElement('div');
      element.className = styles.draftMarker;
      element.setAttribute('aria-label', 'Draft report location');
      draftMarkerRef.current = new Marker({ element }).setLngLat(position).addTo(map);
    } else draftMarkerRef.current.setLngLat(position);
    if (!map.getBounds().contains(position)) map.easeTo({ center: position, duration: prefersReducedMotion() ? 0 : tokens.motionMs.sheet });
  }, [location?.latitude, location?.longitude, loaded]);

  useDemoTransitLayer(mapRef, loaded, demoTransit);

  return <div ref={containerRef} className={styles.canvas} aria-label={demoTransit ? 'Simulated buses and transit stops' : onLocationChange ? 'Choose report location on the map' : 'Map of nearby reported issues'} />;
}
