import type { DemoTransitRoute } from '@/contracts/transit';

export function demoVehiclePosition(route: DemoTransitRoute, seconds: number) {
  const lengths = route.path.slice(1).map((point, index) => {
    const previous = route.path[index];
    return Math.hypot(point.latitude - previous.latitude, (point.longitude - previous.longitude) * Math.cos((point.latitude + previous.latitude) / 2 * Math.PI / 180));
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (!total || route.durationSeconds <= 0) return route.path[0];
  const phase = ((seconds % route.durationSeconds) + route.durationSeconds) % route.durationSeconds / route.durationSeconds;
  let remaining = total * (phase <= 0.5 ? phase * 2 : (1 - phase) * 2);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i] > 0) {
      const fraction = remaining / lengths[i];
      const from = route.path[i], to = route.path[i + 1];
      return { latitude: from.latitude + (to.latitude - from.latitude) * fraction,
        longitude: from.longitude + (to.longitude - from.longitude) * fraction };
    }
    remaining -= lengths[i];
  }
  return route.path[route.path.length - 1];
}
