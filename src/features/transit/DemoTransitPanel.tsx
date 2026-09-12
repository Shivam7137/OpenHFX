'use client';
import { BusFront, MapPin, Pause, Play, RotateCcw } from 'lucide-react';
import type { DemoTransitScenario, TransitStop } from '@/contracts/transit';
import styles from './TransitPanel.module.css';

export function DemoTransitPanel({ scenario, playing, setPlaying, reset, selectedVehicle, selectVehicle, selectedStop, selectStop }: {
  scenario: DemoTransitScenario; playing: boolean; setPlaying: (value: boolean) => void; reset: () => void;
  selectedVehicle: string | null; selectVehicle: (id: string) => void;
  selectedStop: TransitStop | null; selectStop: (stop: TransitStop) => void;
}) {
  return <div className={styles.panel}>
    <p className={styles.demoBadge}>Simulated transit</p><h2>Watch the city move</h2>
    <p className="meta">Four demo buses, two illustrative routes. Select a bus or stop to explore.</p>
    <div className={styles.demoControls}><button className="secondary" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={18} /> : <Play size={18} />}{playing ? 'Pause buses' : 'Play buses'}</button><button className="secondary" onClick={reset}><RotateCcw size={18} />Reset</button></div>
    <p className={styles.notice}>Demo only — buses, routes, and stops are simulated. These are not real vehicle locations or travel information.</p>
    {selectedVehicle && <p role="status" className={styles.demoSelection}><BusFront size={20} />Bus {selectedVehicle} · {playing ? 'Simulation running' : 'Paused'}</p>}
    {selectedStop && <p role="status" className={styles.demoSelection}><MapPin size={20} />{selectedStop.name}</p>}
    {scenario.routes.map(route => <section className={styles.demoRoute} key={route.id}>
      <h3><span className={styles.route} style={{ backgroundColor: route.color }}>{route.id}</span>{route.name}</h3>
      {scenario.vehicles.filter(vehicle => vehicle.routeId === route.id).map(vehicle => <button key={vehicle.id} className={styles.stop} aria-pressed={selectedVehicle === vehicle.id} onClick={() => selectVehicle(vehicle.id)}><BusFront size={20} /><span><strong>Demo bus {vehicle.id}</strong><small>{playing ? 'Moving along the demo route' : 'Simulation paused'}</small></span></button>)}
    </section>)}
    <h3 className={styles.alertHeading}>Demo stops</h3>
    {scenario.stops.map(stop => <button key={stop.id} className={styles.stop} aria-pressed={selectedStop?.id === stop.id} onClick={() => selectStop(stop)}><MapPin size={20} /><span><strong>{stop.name}</strong><small>{stop.code} · Illustrative stop location</small></span></button>)}
  </div>;
}
