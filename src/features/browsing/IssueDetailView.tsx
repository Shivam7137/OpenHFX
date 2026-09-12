"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, Check, MapPin, Plus } from "lucide-react";
import {
  CATEGORY_LABELS,
  type ApiEnvelope,
  type IssueDetail,
} from "@/contracts";
import { useSession } from "@/components/shell";
import { errorMessage, mutate, usePoll } from "@/components/api";
import {
  ErrorNotice,
  Status,
  SyncStatus,
  Time,
  EmptyState,
} from "@/components/ui";
import { MapView } from "@/features/map/MapView";
import { EvidenceComposer } from "@/features/reporting/EvidenceComposer";
import { Coordination } from "@/features/coordination/Coordination";

export function IssueDetailView({
  id,
  authority = false,
}: {
  id: string;
  authority?: boolean;
}) {
  const poll = usePoll<ApiEnvelope<IssueDetail>>(
    `${authority ? "/authority" : ""}/issues/${id}`,
  );
  const issue = poll.data?.data;
  const { session } = useSession();
  const [evidence, setEvidence] = useState(false);
  const [reopen, setReopen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("evidence") === "true")
      setEvidence(true);
  }, []);
  async function follow() {
    if (!issue) return;
    setPending(true);
    try {
      await mutate(
        `/issues/${id}/follow`,
        { following: !issue.following },
        "PUT",
      );
      await poll.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="page detail-page">
      <Link className="back-link" href={authority ? "/authority" : "/public"}>
        <ArrowLeft size={18} />
        {authority ? "Organization inbox" : "Nearby issues"}
      </Link>
      <ErrorNotice message={poll.error} retry={poll.refresh} />
      {!issue && !poll.error && <p>Loading the issue…</p>}
      {issue && (
        <>
          <header className="issue-heading">
            <div>
              <p className="muted">
                {CATEGORY_LABELS[issue.category]} · {issue.reference}
                {issue.isDemo && " · Demo issue"}
              </p>
              <h1>{issue.title}</h1>
              <p className="place">
                <MapPin size={17} />
                {issue.publicLocationLabel}
                {issue.locationPrecision === "approximate" && " (approximate)"}
              </p>
              <Status status={issue.status} />
              {issue.priorityReviewed && issue.priority !== "standard" && (
                <span className="priority">
                  {issue.priority} · Authority reviewed
                </span>
              )}
            </div>
            {!authority &&
              (session?.user ? (
                <button
                  className={issue.following ? "secondary" : "button"}
                  disabled={pending}
                  onClick={follow}
                >
                  {issue.following ? (
                    <Check size={18} />
                  ) : (
                    <Bookmark size={18} />
                  )}{" "}
                  {pending
                    ? "Saving…"
                    : issue.following
                      ? "Following"
                      : "Follow issue"}
                </button>
              ) : (
                <Link
                  className="secondary"
                  href={`/demo/sign-in?next=${encodeURIComponent(`/public/issues/${id}`)}`}
                >
                  Sign in to follow
                </Link>
              ))}
          </header>
          <SyncStatus {...poll} />
          <ErrorNotice message={error} />
          {success && (
            <div className="success-notice" role="status">
              <Check size={18} />
              {success}
            </div>
          )}
          <div className="detail-grid">
            <div className="detail-main">
              <MapView
                compact
                issues={[issue]}
                selectedIssueId={issue.id}
              />
              <section className="next-step">
                <span className="field-label">What happens next</span>
                <h2>{issue.nextStep || "Awaiting authority review"}</h2>
                <p>{issue.summary}</p>
              </section>
              {authority && (
                <Coordination issue={issue} refresh={poll.refresh} />
              )}
              <section className="section">
                <h2>
                  {issue.response.length}{" "}
                  {issue.response.length === 1
                    ? "organization"
                    : "organizations"}{" "}
                  involved
                </h2>
                {!issue.response.length && (
                  <p className="muted">
                    Awaiting assignment. No organization has accepted
                    responsibility yet.
                  </p>
                )}
                {issue.response.map((response) => (
                  <div className="response-row" key={response.organizationId}>
                    <div>
                      <strong>{response.organizationName}</strong>
                      <span className="meta">
                        {response.isLead
                          ? "Lead organization"
                          : "Contributing organization"}
                      </span>
                    </div>
                    <Status status={response.assignmentStatus} />
                    {response.nextStep && <p>{response.nextStep}</p>}
                  </div>
                ))}
              </section>
              <section className="section">
                <div className="row-between">
                  <h2>
                    Evidence{" "}
                    <span className="count">{issue.evidenceCount}</span>
                  </h2>
                  <button
                    className="text-button"
                    onClick={() => {
                      setReopen(false);
                      setEvidence(true);
                    }}
                  >
                    <Plus size={18} />
                    Add evidence
                  </button>
                </div>
                {!issue.contributions.length && (
                  <EmptyState title="More context helps">
                    Add a useful detail or photo of the issue.
                  </EmptyState>
                )}
                {issue.contributions.map((c) => (
                  <article className="evidence-row" key={c.id}>
                    <div className="row-between">
                      <strong>{c.authorName}</strong>
                      <Time date={c.createdAt} />
                    </div>
                    <p className="preserve-lines">{c.body}</p>
                    {c.attachments.length > 0 && (
                      <div className="evidence-photos">
                        {c.attachments.map((a) => (
                          <a
                            key={a.id}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={a.url}
                              alt={a.description || "Issue evidence"}
                            />
                            {a.description && (
                              <span className="meta">{a.description}</span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </section>
            </div>
            <aside className="timeline-panel">
              <h2>{authority ? "Response timeline" : "Public timeline"}</h2>
              <p className="meta">Recorded actions from the shared issue.</p>
              <ol className="timeline">
                {issue.events.map((event) => (
                  <li key={event.id} id={`event-${event.id}`}>
                    <span className="timeline-dot" />
                    <div>
                      <div className="row-between">
                        <strong>{event.actorName}</strong>
                        {event.visibility === "staff" && (
                          <span className="staff-label">Staff only</span>
                        )}
                      </div>
                      <p className="preserve-lines">{event.text}</p>
                      <Time date={event.createdAt} />
                    </div>
                  </li>
                ))}
              </ol>
              {!issue.events.length && (
                <p className="muted">No published updates yet.</p>
              )}
            </aside>
          </div>
          {issue.status === "resolved" && (
            <div className="section">
              <h2>Does this still need attention?</h2>
              <p>
                A reopening request is reviewed by the lead organization. For a
                separate incident, create a new report.
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setReopen(true);
                  setEvidence(true);
                }}
              >
                Request reopening
              </button>
            </div>
          )}
          <EvidenceComposer
            issueId={id}
            open={evidence}
            onOpenChange={setEvidence}
            reopen={reopen}
            onSaved={() => {
              setSuccess(reopen ? "Reopening request sent" : "Evidence added");
              void poll.refresh();
            }}
          />
        </>
      )}
    </div>
  );
}
