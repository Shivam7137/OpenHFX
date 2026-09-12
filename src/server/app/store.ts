import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Attachment, Assignment, Contribution, IssueSummary, Location, Notification, Organization, Preparation, ReopenRequest, Team, TimelineEvent, User, WorkTask } from '@/contracts';
import { seedState } from './seed';

export interface StoredIssue extends IssueSummary {
  reporterId: string; originalDescription: string; exactLocation: Location;
  nominatedLeadId: string | null; relatedIssueId: string | null;
}
export interface StoredAttachment extends Attachment { ownerId: string; issueId: string | null }
export interface StoredPreparation extends Preparation { ownerId: string }
export interface State {
  users: User[]; organizations: Organization[]; teams: Team[]; issues: StoredIssue[];
  assignments: Assignment[]; tasks: WorkTask[]; events: TimelineEvent[];
  contributions: (Contribution & { authorId: string })[];
  attachments: StoredAttachment[]; preparations: StoredPreparation[];
  reopenRequests: (ReopenRequest & { issueId: string; authorId: string; attachmentIds: string[] })[];
  follows: { userId: string; issueId: string }[];
  notifications: (Notification & { userId: string })[];
  sessions: { tokenHash: string; userId: string; expires: number }[];
  idempotency: Record<string, { hash: string; result: unknown; createdAt: number }>;
  sequence: number;
}
export const now = () => new Date().toISOString();
export const id = () => randomUUID();

export function createStore(directory: string) {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(join(resolve(directory), 'openhfx.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, bytes BLOB NOT NULL);');
  if (!db.prepare('SELECT id FROM state WHERE id=1').get()) {
    db.prepare('INSERT OR IGNORE INTO state(id,data) VALUES(1,?)').run(JSON.stringify(seedState()));
  }
  const read = (): State => JSON.parse((db.prepare('SELECT data FROM state WHERE id=1').get() as { data: string }).data);
  const transaction = <T>(fn: (state: State) => T): T => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const state = read();
      const result = fn(state);
      db.prepare('UPDATE state SET data=? WHERE id=1').run(JSON.stringify(state));
      db.exec('COMMIT');
      return result;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  // A process restart never leaves an owner waiting indefinitely for an interrupted job.
  transaction(state => {
    for (const preparation of state.preparations) {
      if (preparation.status === 'queued' || preparation.status === 'running') {
        preparation.status = 'failed'; preparation.error = { code: 'TEMPORARY_FAILURE', message: 'Preparation was interrupted. Your report is safe; try again or continue manually.' }; preparation.updatedAt = now();
      }
    }
  });
  return {
    read, transaction,
    putImage(imageId: string, bytes: Uint8Array) { db.prepare('INSERT INTO images(id,bytes) VALUES(?,?)').run(imageId, bytes); },
    getImage(imageId: string) { return (db.prepare('SELECT bytes FROM images WHERE id=?').get(imageId) as { bytes: Uint8Array } | undefined)?.bytes; },
    close() { db.close(); },
  };
}
export type Store = ReturnType<typeof createStore>;
const globalStore = globalThis as typeof globalThis & { openhfxStore?: Store };
export function getStore() { return globalStore.openhfxStore ??= createStore(process.env.OPENHFX_DATA_DIR || resolve('.data')); }
