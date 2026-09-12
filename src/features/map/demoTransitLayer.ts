import { useEffect, useRef, type RefObject } from 'react';
import { Marker, type Map } from 'maplibre-gl';
import type { DemoTransitScenario } from '@/contracts/transit';
import { demoVehiclePosition } from '@/features/transit/demoSimulation';
import styles from './MapView.module.css';

export interface DemoTransitDisplay {
  scenario: DemoTransitScenario; playing: boolean; resetKey: number;
  selectedVehicle: string | null; onSelectVehicle: (id: string) => void;
}

/** Animate only map markers, keeping animation out of React's page render loop. */
export function useDemoTransitLayer(mapRef: RefObject<Map | null>, loaded: boolean, demo?: DemoTransitDisplay) {
  const current = useRef(demo);
  current.current = demo;
  const scenario = demo?.scenario;
  // The immutable demo endpoint may refresh on focus; identical data must not reset movement.
  const scenarioKey = JSON.stringify(scenario);
  const resetKey = demo?.resetKey;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !scenario) return;
    const source = 'demo-transit-routes';
    map.addSource(source, { type: 'geojson', data: { type: 'FeatureCollection', features: scenario.routes.map(route => ({
      type: 'Feature', properties: { color: route.color }, geometry: { type: 'LineString', coordinates: route.path.map(point => [point.longitude, point.latitude]) },
    })) } });
    map.addLayer({ id: 'demo-route-casing', type: 'line', source, paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.85 } }, 'transit-stop-symbols');
    map.addLayer({ id: 'demo-route-line', type: 'line', source, paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.8 } }, 'transit-stop-symbols');
    const points = scenario.routes.flatMap(route => route.path);
    map.fitBounds([[Math.min(...points.map(p => p.longitude)), Math.min(...points.map(p => p.latitude))],
      [Math.max(...points.map(p => p.longitude)), Math.max(...points.map(p => p.latitude))]], { padding: 65, maxZoom: 15.2, duration: 0 });
    const markers = scenario.vehicles.flatMap(vehicle => {
      const route = scenario.routes.find(value => value.id === vehicle.routeId);
      if (!route) return [];
      const button = document.createElement('button');
      button.type = 'button'; button.className = styles.demoBus; button.style.backgroundColor = route.color;
      button.dataset.demoVehicle = vehicle.id;
      button.setAttribute('aria-label', `Demo bus ${vehicle.id}, ${route.name}`);
      // Fixed icon markup; feed/scenario strings are assigned through textContent.
      button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 19v3m8-3v3M8 15h1m6 0h1"/></svg>';
      const label = document.createElement('span'); label.textContent = route.id; button.append(label);
      const select = (event: MouseEvent) => { event.stopPropagation(); current.current?.onSelectVehicle(vehicle.id); };
      button.addEventListener('click', select);
      const position = demoVehiclePosition(route, vehicle.offsetSeconds);
      const marker = new Marker({ element: button }).setLngLat([position.longitude, position.latitude]).addTo(map);
      return [{ vehicle, route, marker, button, select }];
    });
    let frame = 0, elapsed = 0, previous = performance.now();
    const animate = (now: number) => {
      if (current.current?.playing && document.visibilityState === 'visible') elapsed += Math.max(0, Math.min(now - previous, 100));
      previous = now;
      for (const { vehicle, route, marker, button } of markers) {
        const position = demoVehiclePosition(route, elapsed / 1000 + vehicle.offsetSeconds);
        marker.setLngLat([position.longitude, position.latitude]);
        button.setAttribute('aria-pressed', String(current.current?.selectedVehicle === vehicle.id));
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      markers.forEach(({ marker, button, select }) => { button.removeEventListener('click', select); marker.remove(); });
      if (mapRef.current === map) {
        for (const layer of ['demo-route-line', 'demo-route-casing']) if (map.getLayer(layer)) map.removeLayer(layer);
        if (map.getSource(source)) map.removeSource(source);
      }
    };
  }, [mapRef, loaded, scenarioKey, resetKey]);
}
