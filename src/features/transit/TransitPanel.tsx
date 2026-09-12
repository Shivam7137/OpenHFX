'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, BusFront, ExternalLink, Star } from 'lucide-react';
import type { ApiEnvelope } from '@/contracts';
import type { TransitBoard, TransitStop } from '@/contracts/transit';
import { usePoll } from '@/components/api';
import { ErrorNotice } from '@/components/ui';
import { currentDepartures, predictionFeedIsFresh } from './presentation';
import styles from './TransitPanel.module.css';

const SAVED_KEY = 'openhfx.saved-transit-stops.v1';
const time = (value: string) => new Date(value).toLocaleTimeString('en-CA', { timeZone: 'America/Halifax', hour: 'numeric', minute: '2-digit' });
export function TransitPanel({ stops, loading, error, stale, offline, retry, selected, onSelect }: {
  stops: TransitStop[]; loading: boolean; error: string | null; stale: boolean; offline: boolean;
  retry: () => void; selected: TransitStop | null; onSelect: (stop: TransitStop | null) => void;
}) {
  const [saved, setSaved] = useState<TransitStop[]>([]);
  const [storageError, setStorageError] = useState('');
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const poll = usePoll<ApiEnvelope<TransitBoard>>(selected ? `/transit/stops/${encodeURIComponent(selected.id)}` : null, 30_000);
  const board = poll.data?.data;
  useEffect(() => {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      if (Array.isArray(data)) setSaved(data.filter((s): s is TransitStop => !!s && typeof s.id === 'string' && /^[\w.-]{1,100}$/.test(s.id) && typeof s.name === 'string' && s.name.length < 300 && typeof s.code === 'string' && Number.isFinite(s.location?.latitude) && Math.abs(s.location.latitude) <= 90 && Number.isFinite(s.location?.longitude) && Math.abs(s.location.longitude) <= 180).slice(0, 8).map(({ distanceMeters: _distance, ...stop }) => stop));
    } catch { setStorageError('Saved stops are unavailable in this browser.'); }
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    const wake = () => setNow(Date.now());
    document.addEventListener('visibilitychange', wake);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', wake); };
  }, []);
  function toggleSave(stop: TransitStop) {
    const exists = saved.some(value => value.id === stop.id);
    if (!exists && saved.length >= 8) { setStorageError('Eight stops saved. Remove one to save another.'); return; }
    const { distanceMeters: _distance, ...savedStop } = stop;
    const next = exists ? saved.filter(value => value.id !== stop.id) : [...saved, savedStop];
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); setSaved(next); setStorageError(''); }
    catch { setStorageError('This browser could not save the stop.'); }
  }
  const departures = board ? currentDepartures(board, now) : [];
  const predictionsStale = board && !predictionFeedIsFresh(board, now);
  const alertsStale = board && !predictionFeedIsFresh({ stale: board.alertsStale, updatedAt: board.alertsUpdatedAt }, now);
  const filtered = stops.filter(stop => `${stop.name} ${stop.code}`.toLowerCase().includes(query.toLowerCase()));
  function stopRow(stop: TransitStop) {
    return <button className={styles.stop} key={stop.id} onClick={() => onSelect(stop)}>
      <BusFront size={20} aria-hidden /><span><strong>{stop.name}</strong><small>Stop {stop.code}{stop.distanceMeters !== undefined ? ` · ${stop.distanceMeters < 1000 ? `${Math.round(stop.distanceMeters)} m` : `${(stop.distanceMeters / 1000).toFixed(1)} km`} from map centre` : ''}</small></span>
    </button>;
  }
  return <div className={styles.panel}>
    {storageError && <p className={styles.notice} role="status">{storageError}</p>}
    {selected ? <>
      <button className={`text-button ${styles.back}`} onClick={() => onSelect(null)}><ArrowLeft size={18} />All nearby stops</button>
      <div className={styles.stopHeading}><div><p className="meta">Halifax Transit · Stop {selected.code}</p><h2>{selected.name}</h2></div>
        <button className={styles.save} aria-label={saved.some(s => s.id === selected.id) ? 'Remove saved stop' : 'Save stop'} aria-pressed={saved.some(s => s.id === selected.id)} onClick={() => toggleSave(selected)}><Star size={21} fill={saved.some(s => s.id === selected.id) ? 'currentColor' : 'none'} /></button>
      </div>
      <ErrorNotice message={poll.error} retry={poll.refresh} />
      {poll.offline && <p className={styles.notice}>Offline. Reconnect for new predictions.</p>}
      {!board && !poll.error && !poll.offline && <p role="status">Loading departures…</p>}
      {board && <>
        {(alertsStale || board.alerts.length > 0) && <section aria-label="Service notices">
          <h3 className={styles.alertHeading}>Service notices</h3>
          {alertsStale && <p className={styles.notice}>Current service notices are unavailable. Any notices below may be out of date.</p>}
          {board.alerts.map(alert => <details key={alert.id} className={styles.alert}><summary>{alert.title}</summary><p>{alert.description}</p>{alert.url && <a href={alert.url} target="_blank" rel="noreferrer">Read transit notice <ExternalLink size={14} /></a>}</details>)}
        </section>}
        <div className={styles.boardHeading}><h3>Next departures</h3><span>Estimates</span></div>
        {predictionsStale ? <p className={styles.notice}>Live predictions are unavailable or out of date. Check the official schedule before travelling.</p> : <>
          {departures.map(departure => <div className={styles.departure} key={departure.id}>
            <span className={styles.route}>{departure.route}</span><span><strong>{departure.headsign}</strong><small>{time(departure.departureAt)}</small></span>
            <span className={styles.minutes}>{Math.max(1, Math.ceil((Date.parse(departure.departureAt) - now) / 60_000))}<small>min</small></span>
          </div>)}
          {!departures.length && <p className={styles.notice}>No current predictions for this stop. This does not mean there is no scheduled service.</p>}
        </>}
        <p className="meta">{board.updatedAt ? `Feed updated ${time(board.updatedAt)} Halifax time. ` : ''}Checks every 30 seconds.</p>
        {!alertsStale && !board.alerts.length && <p className="meta">No active notices matched this stop or its predicted routes.</p>}
      </>}
    </> : <>
      <h2>Your daily stops</h2><p className="meta">Choose a stop for departure predictions and service notices. Save the ones you use most.</p>
      {saved.length > 0 && <section className={styles.saved}><h3><Star size={16} />Saved on this device</h3>{saved.map(stopRow)}</section>}
      <label className={styles.search}>Filter displayed stops<input type="search" placeholder="Stop name or number" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <ErrorNotice message={error} retry={retry} />
      {offline && <p className={styles.notice} role="status">Offline. Reconnect to load stops in this area.</p>}
      {stale && <p className={styles.notice}>Using previously loaded stops. Their details may have changed.</p>}
      {loading && !offline && <p role="status">Loading Halifax stops…</p>}
      {!loading && !error && !offline && <p className="meta">{query ? `${filtered.length} matching stops from the ` : ''}{stops.length} closest stops (within 3 km of the searched map centre).</p>}
      {filtered.map(stopRow)}
      {!loading && !error && !offline && !filtered.length && <p className={styles.notice}>No displayed stops match. Move the map, choose “Search this area,” or change the filter.</p>}
    </>}
    <footer className={styles.source}><a href="https://www.halifax.ca/transportation/halifax-transit/routes-schedules" target="_blank" rel="noreferrer">Official routes & schedules <ExternalLink size={14} /></a><p>Stop and prediction data: Halifax Transit. Reported problems are separate demo data.</p><a href="https://data-hrm.hub.arcgis.com/pages/open-data-licence" target="_blank" rel="noreferrer">Contains information licenced under the Open Government Licence — Halifax.</a></footer>
  </div>;
}
