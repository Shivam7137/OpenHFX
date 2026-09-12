import { expect, it } from 'vitest';
import { demoVehiclePosition } from '@/features/transit/demoSimulation';
import type { DemoTransitRoute } from '@/contracts/transit';

const route: DemoTransitRoute = { id: 'D1', name: 'Illustrative route', color: '#145E78', durationSeconds: 100,
  path: [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }, { latitude: 0, longitude: 3 }] };

it('moves by distance along the route and returns without teleporting at the end', () => {
  expect(demoVehiclePosition(route, 0)).toEqual({ latitude: 0, longitude: 0 });
  expect(demoVehiclePosition(route, 25)).toEqual({ latitude: 0, longitude: 1.5 });
  expect(demoVehiclePosition(route, 50)).toEqual({ latitude: 0, longitude: 3 });
  expect(demoVehiclePosition(route, 75)).toEqual({ latitude: 0, longitude: 1.5 });
  expect(demoVehiclePosition(route, 100)).toEqual(demoVehiclePosition(route, 0));
  expect(demoVehiclePosition(route, 49.99).longitude).toBeCloseTo(demoVehiclePosition(route, 50.01).longitude, 8);
});

it('is deterministic for paused time and retains a stationary single-point route', () => {
  expect(demoVehiclePosition(route, 30)).toEqual(demoVehiclePosition(route, 130));
  expect(demoVehiclePosition({ ...route, path: [route.path[0]] }, 42)).toEqual(route.path[0]);
});
