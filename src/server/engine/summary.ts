import type { ProgressSummary, PublishedEvent } from '../../contracts';
import { EngineError } from './types';

/** Caller supplies published events only. Runtime filtering additionally rejects staff data. */
export function summarizeProgress(events: PublishedEvent[]): ProgressSummary {
  if (!Array.isArray(events) || events.length > 1000) throw new EngineError('INVALID_INPUT');
  const publicEvents = events.filter(event => event?.visibility === 'public');
  if (publicEvents.some(event => typeof event.id !== 'string' || !event.id || event.id.length > 160
    || typeof event.issueId !== 'string' || !event.issueId || event.issueId.length > 160
    || typeof event.text !== 'string' || event.text.length > 2000
    || typeof event.createdAt !== 'string' || !Number.isFinite(Date.parse(event.createdAt)))) {
    throw new EngineError('INVALID_INPUT');
  }
  if (new Set(publicEvents.map(event => event.issueId)).size > 1) throw new EngineError('INVALID_INPUT');
  const unique = new Map<string, PublishedEvent>();
  for (const event of publicEvents) {
    const previous = unique.get(event.id);
    if (previous && (previous.text !== event.text || previous.createdAt !== event.createdAt)) throw new EngineError('INVALID_INPUT');
    if (event.text.trim()) unique.set(event.id, event);
  }
  const selected = [...unique.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id)).slice(-6);
  const sourceEventIds: string[] = [];
  const parts: string[] = [];
  let remaining = 1600;
  // Reserve space for the latest facts first, then display retained excerpts chronologically.
  for (const event of selected.reverse()) {
    if (remaining < 1) break;
    const text = event.text.trim().slice(0, remaining);
    parts.unshift(text);
    sourceEventIds.unshift(event.id);
    remaining -= text.length + 1;
  }
  return { text: parts.join('\n') || 'No published public updates yet.', sourceEventIds, mode: 'extractive' };
}
