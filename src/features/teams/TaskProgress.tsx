"use client";
import { useState } from "react";
import Link from "next/link";
import {
  STATUS_LABELS,
  type WorkStatus,
  type WorkTask,
  type ApiEnvelope,
  type IssueDetail,
} from "@/contracts";
import { errorMessage, mutate, usePoll } from "@/components/api";
import { ErrorNotice, Status, Time } from "@/components/ui";
const stages: WorkStatus[] = [
  "assigned",
  "en_route",
  "on_site",
  "working",
  "complete",
];
export function TaskProgress({
  task,
  refresh,
  link = false,
}: {
  task: WorkTask;
  refresh: () => Promise<void>;
  link?: boolean;
}) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<WorkStatus | "">("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const context = usePoll<ApiEnvelope<IssueDetail>>(
    link ? `/authority/issues/${task.issueId}` : null,
  );
  const next: WorkStatus =
    task.status === "blocked"
      ? task.previousActiveStatus || "working"
      : stages[Math.min(stages.indexOf(task.status) + 1, 4)];
  async function save() {
    setPending(true);
    setError(null);
    try {
      await mutate(`/authority/tasks/${task.id}/progress`, {
        status: status || next,
        note,
        expectedVersion: task.version,
      });
      setNote("");
      setStatus("");
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
      await refresh();
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="work-panel">
      <div className="row-between">
        <h3>{task.teamName}</h3>
        <Status status={task.status} />
      </div>
      <p>{task.purpose}</p>
      {context.data && (
        <p className="meta">
          {context.data.data.title}
          <br />
          {context.data.data.publicLocationLabel} · Assigned issue location
        </p>
      )}
      <p className="meta">Assigned to {task.assigneeName}</p>
      <p className="meta">
        Last reported <Time date={task.lastReportedAt} />
      </p>
      <ol className="work-rail" aria-label="Work milestones">
        {stages.map((stage, index) => (
          <li
            key={stage}
            className={
              task.status === stage
                ? "current"
                : stages.indexOf(task.status) > index
                  ? "done"
                  : ""
            }
          >
            {STATUS_LABELS[stage]}
          </li>
        ))}
      </ol>
      {task.status === "blocked" && (
        <div className="notice">Work is blocked. Record a note to resume.</div>
      )}
      {task.resultNote && <p className="preserve-lines">{task.resultNote}</p>}
      <ErrorNotice message={error} />
      {task.status !== "complete" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label>
            Progress update
            <select
              value={status || next}
              onChange={(e) => setStatus(e.target.value as WorkStatus)}
            >
              {[
                ...stages.filter((s) => s !== "assigned"),
                "blocked" as WorkStatus,
              ].map((s) => (
                <option key={s} value={s}>
                  {s === next && task.status === "blocked"
                    ? `Resume: ${STATUS_LABELS[s]}`
                    : STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {(status || next) === "complete"
              ? "Result note"
              : (status || next) === "blocked"
                ? "What is blocking the work?"
                : "Progress note"}
            <textarea
              required
              maxLength={2000}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record what happened and the next action"
            />
          </label>
          <button className="button" disabled={pending}>
            {pending
              ? "Saving…"
              : (status || next) === "complete"
                ? "Complete my task"
                : (status || next) === "blocked"
                  ? "Report blocker"
                  : "Save work progress"}
          </button>
        </form>
      )}
      {link && (
        <Link
          className="text-button"
          href={`/authority/issues/${task.issueId}`}
        >
          Open shared issue
        </Link>
      )}
      <p className="meta">
        Work milestones are reported by people. They do not track location or
        complete the whole issue.
      </p>
    </article>
  );
}
