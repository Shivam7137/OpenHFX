'use client';

import { useState } from 'react';
import { MapPin, Map, LocateFixed, Layers, ArrowUpRight } from 'lucide-react';
import type { IssueSummary, Location } from '@/contracts';
import styles from './MapPlaceholder.module.css';

/** Map-team boundary: replace this component; keep the props and public coordinates. */
export interface MapPlaceholderProps {
  issues: IssueSummary[];
  selectedIssueId?: string | null;
  onSelect?: (id: string) => void;
  location?: Location;
  onLocationChange?: (location: Location) => void;
  compact?: boolean;
}

export function MapPlaceholder({ issues, selectedIssueId, onSelect, location, onLocationChange, compact = false }: MapPlaceholderProps) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  function locate() {
    if (!navigator.geolocation) { setLocationError('Device location is unavailable. Enter coordinates below.'); return; }
    setLocating(true); setLocationError('');
    navigator.geolocation.getCurrentPosition(position => {
      onLocationChange?.({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocating(false);
    }, () => {
      setLocationError('Location could not be obtained. Enter coordinates below.');
      setLocating(false);
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
  }
  return <section className={`${styles.frame} ${compact ? styles.compact : ''}`} aria-label="Map integration placeholder">
    <div className={styles.grid} aria-hidden="true">
      <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice">
        <path d="M410 0H640V420H300L310 345 365 285 345 230 395 180 375 115Z" fill="#C9E2E7" />
        <path d="M32 40h100v90H32zM120 280h86v110h-86zM259 20h56v97h-56z" fill="#DCE8D8" />
        <g fill="none" stroke="white" strokeWidth="12"><path d="M-40 140 480-10M-40 290 405 162M-20 420 350 315M60-20l145 460M225-20l129 460" /></g>
        <g fill="none" stroke="#D5E0E3" strokeWidth="2"><path d="M-40 140 480-10M-40 290 405 162M-20 420 350 315M60-20l145 460M225-20l129 460" /></g>
      </svg>
    </div>
    <div className={styles.topline}><span><Map size={16} /> Location overview</span><span className={styles.badge}>Map placeholder</span></div>
    <div className={styles.message}>
      <span className={styles.pin}><MapPin size={compact ? 22 : 30} strokeWidth={1.6} /></span>
      <strong>{location ? 'Report location' : 'A place for every report.'}</strong>
      {!compact && <p>The live map is not connected yet. Explore the issue list or choose a location below.</p>}
      {location && <span className={styles.coordinates}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>}
    </div>
    {!compact && !onLocationChange && <div className={styles.bottomline}><span><Layers size={15} /> {issues.length} {issues.length === 1 ? 'issue' : 'issues'} in this view</span><span>Illustration only</span></div>}
    {onSelect && issues.length > 0 && <div className={styles.selection} aria-label="Select an issue">
      {issues.slice(0, 3).map(issue => <button key={issue.id} type="button" aria-pressed={selectedIssueId === issue.id} onClick={() => onSelect(issue.id)}>
        <MapPin size={16} /><span>{issue.title}</span><ArrowUpRight size={15} />
      </button>)}
    </div>}
    {onLocationChange && <div className={styles.locationInput}>
      <button type="button" className={styles.locate} onClick={locate} disabled={locating}><LocateFixed size={18} />{locating ? 'Finding location…' : 'Use my location'}</button>
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
      <p>{locationError || 'Confirm these coordinates before sending. The illustration does not position a real map pin.'}</p>
    </div>}
  </section>;
}
