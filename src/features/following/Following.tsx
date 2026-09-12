"use client";
import Link from "next/link";
import { useState } from "react";
import {
  type ListEnvelope,
  type IssueSummary,
  type Notification,
} from "@/contracts";
import { useSession, SignInRequired } from "@/components/shell";
import { usePoll, mutate, errorMessage } from "@/components/api";
import {
  EmptyState,
  ErrorNotice,
  IssueRow,
  SyncStatus,
  Time,
} from "@/components/ui";
export function Following({ authority = false }: { authority?: boolean }) {
  const { session } = useSession();
  const issues = usePoll<ListEnvelope<IssueSummary>>(
    session?.user && !authority ? "/issues?following=true" : null,
  );
  const updates = usePoll<ListEnvelope<Notification>>(
    session?.user ? "/notifications" : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  if (!session?.user) return <SignInRequired authority={authority} />;
  async function markRead(id: string) {
    setPending(id);
    try {
      await mutate(`/notifications/${id}`, { read: true }, "PATCH");
      await updates.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(null);
    }
  }
  const grouped = Object.groupBy(
    updates.data?.items || [],
    (update) => update.issueId,
  );
  return (
    <div className="page reading">
      <h1>{authority ? "Updates" : "Following"}</h1>
      <p className="muted">
        {authority
          ? "The latest from your shared response."
          : "The local issues you care about, in one place."}
      </p>
      <SyncStatus {...updates} />
      <ErrorNotice message={error || updates.error} retry={updates.refresh} />
      <section className="section">
        <h2>Recent updates</h2>
        {updates.data?.items.length === 0 && (
          <EmptyState title="You’re all caught up">
            New published updates will appear here.
          </EmptyState>
        )}
        {Object.entries(grouped).map(([issueId, notifications]) => (
          <div key={issueId} className="notification-group">
            {notifications?.map((n) => (
              <article
                key={n.id}
                className={`notification-row ${n.readAt ? "" : "unread"}`}
              >
                <Link
                  href={`/${authority ? "authority" : "public"}/issues/${n.issueId}#event-${n.eventId}`}
                >
                  <strong>{n.title}</strong>
                  <p>{n.text}</p>
                  <Time date={n.createdAt} />
                </Link>
                {!n.readAt && (
                  <button
                    className="text-button"
                    disabled={pending !== null}
                    onClick={() => markRead(n.id)}
                  >
                    {pending === n.id ? "Saving…" : "Mark read"}
                  </button>
                )}
              </article>
            ))}
          </div>
        ))}
      </section>
      {!authority && (
        <section className="section">
          <h2>Issues you follow</h2>
          <ErrorNotice message={issues.error} retry={issues.refresh} />
          {issues.data?.items.length === 0 && (
            <EmptyState title="Your neighbourhood, followed">
              Open a nearby issue and choose Follow to keep up with its
              response.
            </EmptyState>
          )}
          {issues.data?.items.map((i) => (
            <IssueRow issue={i} key={i.id} />
          ))}
        </section>
      )}
    </div>
  );
}
