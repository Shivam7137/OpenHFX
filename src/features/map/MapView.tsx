'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { LocateFixed, MapPin } from 'lucide-react';
import type { IssueSummary, Location } from '@/contracts';
import type { CameraTarget, LocateTarget } from './MapCanvas';
import type { BoundingBox } from './geo';
import { LEGEND_ENTRIES, STATUS_FILL } from './markerImages';
import styles from './MapView.module.css';

const MapCanvas = dynamic(() => import('./MapCanvas'), { ssr: false });
export interface MapViewProps {
  issues: IssueSummary[];
  selectedIssueId?: string | null;
  onSelect?: (id: string) => void;
  location?: Location;
  onLocationChange?: (location: Location) => void;
  compact?: boolean;
  onBoundsChange?: (bounds: BoundingBox) => void;
  cameraTarget?: CameraTarget;
  authority?: boolean;
}

export function MapView({ issues, selectedIssueId = null, onSelect, location, onLocationChange,
  compact = false, onBoundsChange, cameraTarget = null, authority = false }: MapViewProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locateTarget, setLocateTarget] = useState<LocateTarget>(null);
  const selected = issues.find(issue => issue.id === selectedIssueId);
  const approximate = selected?.locationPrecision === 'approximate';

  function locate() {
    if (!navigator.geolocation) { setLocationError('Device location is unavailable. Use the map or coordinate fields.'); return; }
    setLocating(true); setLocationError('');
    navigator.geolocation.getCurrentPosition(position => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      if (onLocationChange) onLocationChange(next);
      else setLocateTarget({ ...next, nonce: Date.now() });
      setLocating(false);
    }, () => {
      setLocationError(onLocationChange ? 'Location access is unavailable. Tap the map or enter coordinates below.' : 'Location access is unavailable. Pan the map or browse the issue list.');
      setLocating(false);
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
  }

  return <section className={`${styles.frame} ${compact ? styles.compact : ''} ${onLocationChange ? styles.picker : ''}`} aria-label={onLocationChange ? 'Report location' : 'Issue map'}>
    <div className={styles.viewport}>
      <MapCanvas key={attempt} issues={issues} selectedId={selectedIssueId} cameraTarget={cameraTarget}
        locateTarget={locateTarget} bottomInset={0} compact={compact} location={location} onLocationChange={onLocationChange}
        onSelect={ids => { if (ids[0]) onSelect?.(ids[0]); }} onMoved={bounds => onBoundsChange?.(bounds)}
        onReady={() => setState('ready')} onUnavailable={() => setState('unavailable')} />
      {state !== 'ready' && <div className={styles.fallback} role="status">
        <MapPin size={24} />
        <strong>{state === 'loading' ? 'Loading map…' : 'Basemap unavailable'}</strong>
        <p>{onLocationChange ? 'You can still choose coordinates below.' : compact ? 'The report’s location and response remain available below.' : 'Browse the issue list while the map is unavailable.'}</p>
        {state === 'unavailable' && <button type="button" className="secondary compact-button" onClick={() => { setState('loading'); setAttempt(value => value + 1); }}>Retry map</button>}
      </div>}
      {!compact && !onLocationChange && state === 'ready' && <button type="button" className={styles.locate} onClick={locate} disabled={locating} aria-label="Use my location"><LocateFixed size={20} />{locating ? 'Locating…' : 'Locate'}</button>}
      {selected && !compact && state === 'ready' && <Link className={styles.selected} href={`/${authority ? 'authority' : 'public'}/issues/${selected.id}`}>
        <strong>{selected.title}</strong><span>{approximate ? 'Approximate area · ' : ''}View response →</span>
      </Link>}
    </div>
    {!compact && !onLocationChange && <div className={styles.legend} aria-label="Marker legend">
      {LEGEND_ENTRIES.map(({ status, label }) => <span key={status}><i style={{ backgroundColor: STATUS_FILL[status] }} aria-hidden />{label}</span>)}
    </div>}
    {approximate && <p className={styles.precision}>Approximate area · exact location private. The halo is an area indicator, not a measured boundary.</p>}
    {locationError && <p className={styles.precision} role="status">{locationError}</p>}
    {onLocationChange && <div className={styles.locationInput}>
      <button type="button" className="secondary full" onClick={locate} disabled={locating}><LocateFixed size={18} />{locating ? 'Finding location…' : 'Use my location'}</button>
      <div className={styles.fields}>
        <label>Latitude<input type="number" inputMode="decimal" step="any" min="-90" max="90" value={location?.latitude ?? ''} onChange={event => {
          const value = event.currentTarget.valueAsNumber;
          if (Number.isFinite(value) && value >= -90 && value <= 90) onLocationChange({ latitude: value, longitude: location?.longitude ?? -63.5752 });
        }} /></label>
        <label>Longitude<input type="number" inputMode="decimal" step="any" min="-180" max="180" value={location?.longitude ?? ''} onChange={event => {
          const value = event.currentTarget.valueAsNumber;
          if (Number.isFinite(value) && value >= -180 && value <= 180) onLocationChange({ latitude: location?.latitude ?? 44.6488, longitude: value });
        }} /></label>
      </div>
      <p className="meta">Tap the map or enter coordinates, then confirm this location before sending.</p>
    </div>}
  </section>;
}
