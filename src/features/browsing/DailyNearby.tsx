'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BusFront, MapPinned, Plus, Search } from 'lucide-react';
import { CATEGORIES, CATEGORY_LABELS, type ApiEnvelope, type Category, type IssueSummary, type ListEnvelope } from '@/contracts';
import type { DemoTransitScenario, TransitNearby, TransitStop } from '@/contracts/transit';
import { usePoll } from '@/components/api';
import { EmptyState, ErrorNotice, IssueRow, SyncStatus } from '@/components/ui';
import { MapView } from '@/features/map/MapView';
import type { BoundingBox } from '@/features/map/geo';
import type { CameraTarget, LocateTarget } from '@/features/map/MapCanvas';
import { TransitPanel } from '@/features/transit/TransitPanel';
import { DemoTransitPanel } from '@/features/transit/DemoTransitPanel';
import styles from './DailyNearby.module.css';

export function DailyNearby() {
  const [demoMode, setDemoMode] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const demo = usePoll<ApiEnvelope<DemoTransitScenario>>(demoMode ? '/transit/demo' : null, 86_400_000);
  const scenario = demo.data?.data;
  const [tab, setTab] = useState<'problems' | 'transit'>('problems');
  const [category, setCategory] = useState<Category | ''>('');
  const [query, setQuery] = useState('');
  const [bounds, setBounds] = useState<BoundingBox | null>(null);
  const [searchBounds, setSearchBounds] = useState<BoundingBox | null>(null);
  const [centre, setCentre] = useState({ latitude: 44.6488, longitude: -63.583 });
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<TransitStop | null>(null);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget>(null);
  const [stopTarget, setStopTarget] = useState<LocateTarget>(null);
  const [showStops, setShowStops] = useState(true);
  const [showAreas, setShowAreas] = useState(true);
  const poll = usePoll<ListEnvelope<IssueSummary>>(`/issues${searchBounds ? `?bbox=${searchBounds.join(',')}` : ''}`);
  const transit = usePoll<ApiEnvelope<TransitNearby>>(demoMode ? null : `/transit?latitude=${centre.latitude}&longitude=${centre.longitude}`, 300_000);
  const items = (poll.data?.items || []).filter(issue => (!category || issue.category === category) && `${issue.title} ${issue.publicLocationLabel}`.toLowerCase().includes(query.toLowerCase()));
  const stops = transit.data?.data.stops || [];
  const mapStops = demoMode ? scenario?.stops || [] : showStops ? selectedStop && !stops.some(stop => stop.id === selectedStop.id) ? [...stops, selectedStop] : stops : [];
  function toggleDemo() {
    setDemoMode(!demoMode); setSelected(null); setSelectedStop(null); setStopTarget(null); setSelectedVehicle(null);
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches); setResetKey(0);
  }
  function selectDemoVehicle(id: string) { setSelectedVehicle(id); setSelectedStop(null); }
  function selectStop(stop: TransitStop | null, recenter = true) {
    if (demoMode) {
      setSelectedStop(stop); setSelectedVehicle(null);
      if (stop && recenter) setStopTarget({ ...stop.location, nonce: Date.now() });
      return;
    }
    setSelectedStop(stop); setSelected(null); setTab('transit'); setShowStops(true);
    if (stop && recenter) setStopTarget({ ...stop.location, nonce: Date.now() });
  }
  function searchArea() {
    if (!bounds) return;
    setSearchBounds(bounds); setSelected(null); setSelectedStop(null);
    setCentre({ latitude: (bounds[1] + bounds[3]) / 2, longitude: (bounds[0] + bounds[2]) / 2 });
  }
  return <div className={styles.page}>
    <header className={styles.heading}><div><h1>Around Halifax</h1><p>Local problems. Your next bus. One neighbourhood view.</p></div><div className={styles.headingActions}><button className={demoMode ? 'button' : 'secondary'} aria-label="Transit mode" aria-pressed={demoMode} onClick={toggleDemo}><BusFront size={20} />Transit mode <span className={styles.modeBadge}>Demo</span></button><Link className="button desktop-report" href="/public/report"><Plus size={20} />Report a problem</Link></div></header>
    <div className={styles.workspace}>
      <section className={styles.mapColumn} aria-label="Neighbourhood map and layers">
        {demoMode ? <div className={styles.layers}><strong className={styles.demoTitle}>Demo buses & stops</strong><button className={styles.searchArea} onClick={toggleDemo}>Back to neighbourhood</button></div> : <div className={styles.layers}><div><button aria-pressed={showAreas} onClick={() => setShowAreas(!showAreas)}>Shaded areas</button><button aria-pressed={showStops} onClick={() => setShowStops(!showStops)}><BusFront size={16} />Transit stops</button></div><button className={styles.searchArea} disabled={!bounds} onClick={searchArea}><Search size={16} />Search this area</button></div>}
        <div className={styles.map}><MapView key={demoMode ? 'demo' : 'nearby'} issues={demoMode ? [] : items} selectedIssueId={!demoMode && items.some(issue => issue.id === selected) ? selected : null}
          onSelect={id => { setSelected(id); setSelectedStop(null); setTab('problems'); }} cameraTarget={cameraTarget} onBoundsChange={setBounds}
          transitStops={mapStops} selectedStopId={selectedStop?.id} onStopSelect={id => { const stop = mapStops.find(value => value.id === id); if (stop) selectStop(stop, false); }} stopCameraTarget={stopTarget} showAreas={!demoMode && showAreas}
          demoTransit={demoMode && scenario ? { scenario, playing, resetKey, selectedVehicle, onSelectVehicle: selectDemoVehicle } : undefined} /></div>
      </section>
      <aside className={styles.panel} aria-label="Neighbourhood details">
        {!demoMode && <div className={styles.tabs} aria-label="Browse problems or transit"><button aria-pressed={tab === 'problems'} onClick={() => setTab('problems')}><MapPinned size={18} />Problems<span>{items.length}</span></button><button aria-pressed={tab === 'transit'} onClick={() => setTab('transit')}><BusFront size={18} />Transit</button></div>}
        <div className={styles.content}>
          {demoMode ? scenario ? <DemoTransitPanel scenario={scenario} playing={playing} setPlaying={setPlaying} reset={() => { setResetKey(value => value + 1); setSelectedStop(null); setSelectedVehicle(null); setStopTarget(null); }} selectedVehicle={selectedVehicle} selectVehicle={selectDemoVehicle} selectedStop={selectedStop} selectStop={selectStop} /> : <div className="empty-state"><ErrorNotice message={demo.error} retry={demo.refresh} />{!demo.error && <p>{demo.offline ? 'Reconnect to load the transit demo.' : 'Loading the transit demo…'}</p>}</div> : tab === 'transit' ? <TransitPanel stops={stops} loading={!transit.data && !transit.error} error={transit.error} stale={transit.data?.data.stale ?? false} offline={transit.offline} retry={transit.refresh} selected={selectedStop} onSelect={selectStop} /> : <>
            <div className={styles.filters}><label className="search-field"><Search size={18} /><span className="sr-only">Search problems or places</span><input type="search" placeholder="Search problems or places" value={query} onChange={e => setQuery(e.target.value)} /></label>
              <label className={styles.category}>Category<select value={category} onChange={e => setCategory(e.target.value as Category | '')}><option value="">All categories</option>{CATEGORIES.map(value => <option value={value} key={value}>{CATEGORY_LABELS[value]}</option>)}</select></label>
              <p className="meta">Demo reports · recorded updates</p>{searchBounds && <button className="text-button" onClick={() => setSearchBounds(null)}>Show problems in all areas</button>}
            </div>
            <SyncStatus {...poll} /><ErrorNotice message={poll.error} retry={poll.refresh} />
            {!poll.data && !poll.error && <p className="empty-state">Loading problems…</p>}
            {poll.data && !items.length && <EmptyState title="No problems in this view">Try another category, search, or map area.</EmptyState>}
            {[...items].sort((a, b) => a.id === selected ? -1 : b.id === selected ? 1 : 0).map(issue => <div key={issue.id} className={selected === issue.id ? styles.selected : styles.issue}>
              <IssueRow issue={issue} /><div className={styles.issueActions}><span>{issue.impactRadiusMeters && issue.status !== 'resolved' ? `Reported area: ~${issue.impactRadiusMeters} m` : 'Point location'}</span><button className="text-button" aria-label={`Show ${issue.title} on map`} onClick={() => { setSelected(issue.id); setSelectedStop(null); setCameraTarget({ issueId: issue.id, nonce: Date.now() }); }}><MapPinned size={15} />Show on map</button></div>
            </div>)}
          </>}
        </div>
      </aside>
    </div>
  </div>;
}
