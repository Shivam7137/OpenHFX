import type { TransitBoard } from '@/contracts/transit';

export function currentDepartures(board: TransitBoard, now: number) {
  if (!predictionFeedIsFresh(board, now)) return [];
  return board.departures.filter(departure => Date.parse(departure.departureAt) >= now);
}

export function predictionFeedIsFresh(board: Pick<TransitBoard, 'stale' | 'updatedAt'>, now: number) {
  const timestamp = Date.parse(board.updatedAt ?? '');
  return !board.stale && Number.isFinite(timestamp) && now - timestamp <= 120_000 && timestamp - now <= 60_000;
}
