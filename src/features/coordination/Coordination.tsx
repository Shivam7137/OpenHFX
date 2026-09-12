"use client";
import { useState } from "react";
import {
  type Assignment,
  type IssueDetail,
  type ListEnvelope,
  type Team,
  type Visibility,
  type ProgressSummary,
  type ApiEnvelope,
} from "@/contracts";
import { useSession } from "@/components/shell";
import { errorMessage, mutate, request, usePoll } from "@/components/api";
import { ErrorNotice, Notice, Status } from "@/components/ui";
import { Decisions } from "./Decisions";
import { TaskProgress } from "@/features/teams/TaskProgress";
export function Coordination({
  issue,
  refresh,
}: {
  issue: IssueDetail;
  refresh: () => Promise<void>;
}) {
  const { session } = useSession();
  const user = session?.user;
  const coordinator = user?.role === "coordinator";
  const own = issue.assignments?.find(
    (a) =>
      a.organizationId === user?.organizationId && a.status !== "withdrawn",
  );
  const [purpose, setPurpose] = useState("");
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  async function action(
    path: string,
    body: unknown,
    message: string,
    key?: string,
  ) {
    setPending(true);
    setError(null);
    setSuccess("");
    try {
      await mutate(path, body, "POST", key);
      setSuccess(message);
      await refresh();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      await refresh();
      return false;
    } finally {
      setPending(false);
    }
  }
  if (!user || user.role === "resident") return null;
  return (
    <section className="section coordination">
      <h2>Coordinate the response</h2>
      <ErrorNotice message={error} />
      {success && (
        <p className="success-text" role="status">
          {success}
        </p>
      )}
      {coordinator && !own && issue.status !== "resolved" && (
        <form
          className="assignment-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            await action(
              `/authority/issues/${issue.id}/assignments`,
              { purpose, required: true, expectedVersion: issue.version },
              "Your organization has accepted an assignment.",
              crypto.randomUUID(),
            );
          }}
        >
          <h3>Accept responsibility</h3>
          <p>
            {issue.leadOrganizationName
              ? `${issue.leadOrganizationName} is coordinating this issue. Your organization can join the response.`
              : "The first accepting organization coordinates the response as lead."}
          </p>
          <label>
            Your organization’s purpose
            <textarea
              required
              maxLength={500}
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe the work your organization will take on"
            />
          </label>
          <button className="button" disabled={pending}>
            {pending ? "Saving…" : "Accept assignment"}
          </button>
        </form>
      )}
      {issue.assignments?.map((assignment) => (
        <AssignmentPanel
          key={assignment.id}
          assignment={assignment}
          editable={
            coordinator &&
            assignment.organizationId === user.organizationId &&
            issue.status !== "resolved"
          }
          refresh={refresh}
        />
      ))}
      {issue.tasks
        ?.filter((t) =>
          coordinator
            ? t.assigneeUserId &&
              issue.assignments?.find((a) => a.id === t.assignmentId)
                ?.organizationId === user.organizationId
            : t.assigneeUserId === user.id,
        )
        .map((task) => (
          <TaskProgress key={task.id} task={task} refresh={refresh} />
        ))}
      {coordinator && own && (
        <>
          <form
            className="publish-panel"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await action(
                  `/authority/issues/${issue.id}/updates`,
                  { visibility, text, expectedVersion: issue.version },
                  visibility === "public"
                    ? "Public update published."
                    : "Staff note saved.",
                )
              )
                setText("");
            }}
          >
            <h3>Keep people informed</h3>
            <fieldset className="audience">
              <legend>Who can see this update?</legend>
              <label>
                <input
                  type="radio"
                  name="audience"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                />
                Public update
              </label>
              <label>
                <input
                  type="radio"
                  name="audience"
                  checked={visibility === "staff"}
                  onChange={() => setVisibility("staff")}
                />
                Staff note
              </label>
            </fieldset>
            <p className="meta">
              {visibility === "public"
                ? "Visible to everyone and sent to followers. Only publish confirmed information."
                : "Staff only. Visible to participating organizations and permitted workers."}
            </p>
            <label>
              {visibility === "public" ? "Public update" : "Staff note"}
              <textarea
                required
                maxLength={2000}
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button className="button" disabled={pending}>
              {pending
                ? "Saving…"
                : visibility === "public"
                  ? "Publish public update"
                  : "Save staff note"}
            </button>
          </form>
          <div className="summary-controls">
            <button
              className="text-button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  const result = await request<ApiEnvelope<ProgressSummary>>(
                    `/authority/issues/${issue.id}/summary`,
                  );
                  setSummary(result.data);
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setPending(false);
                }
              }}
            >
              Summarize published progress
            </button>
            {summary && (
              <Notice>
                {summary.text}
                <p className="meta">
                  Extracted from {summary.sourceEventIds.length} published
                  events. Staff notes are excluded.
                </p>
              </Notice>
            )}
          </div>
        </>
      )}
      {coordinator && <Decisions issue={issue} refresh={refresh} />}
    </section>
  );
}
function AssignmentPanel({
  assignment,
  editable,
  refresh,
}: {
  assignment: Assignment;
  editable: boolean;
  refresh: () => Promise<void>;
}) {
  const teams = usePoll<ListEnvelope<Team>>(editable ? "/teams" : null);
  const [teamId, setTeamId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [status, setStatus] = useState("in_progress");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  async function save(kind: "task" | "progress") {
    setPending(true);
    setError(null);
    try {
      await mutate(
        `/authority/assignments/${assignment.id}/${kind === "task" ? "tasks" : "progress"}`,
        kind === "task"
          ? { teamId, purpose, expectedVersion: assignment.version }
          : { status, nextStep, expectedVersion: assignment.version },
        "POST",
        kind === "task" ? crypto.randomUUID() : undefined,
      );
      setSuccess(kind === "task" ? "Team assigned." : "Assignment updated.");
      if (kind === "task") setPurpose("");
      else setNextStep("");
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
      await refresh();
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="assignment-panel">
      <div className="row-between">
        <h3>{assignment.organizationName}</h3>
        <Status status={assignment.status} />
      </div>
      <p className="meta">
        {assignment.required ? "Required assignment" : "Requirement released"}
      </p>
      <p>{assignment.purpose}</p>
      {assignment.nextStep && (
        <p>
          <strong>Next step:</strong> {assignment.nextStep}
        </p>
      )}
      <ErrorNotice message={error} />
      {success && (
        <p className="success-text" role="status">
          {success}
        </p>
      )}
      {editable && assignment.status !== "complete" && (
        <>
          <details>
            <summary>Assign a team</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save("task");
              }}
            >
              <label>
                Team
                <select
                  required
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">Choose a team</option>
                  {teams.data?.items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Task purpose
                <textarea
                  required
                  maxLength={500}
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </label>
              <ErrorNotice message={teams.error} retry={teams.refresh} />
              <button className="secondary" disabled={pending || !teamId}>
                {pending ? "Saving…" : "Assign team"}
              </button>
            </form>
          </details>
          <details>
            <summary>Update organization assignment</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save("progress");
              }}
            >
              <label>
                Assignment status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="in_progress">In progress</option>
                  <option value="complete">Complete</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </label>
              <label>
                {status === "complete"
                  ? "Assignment outcome"
                  : "Next step or explanation"}
                <textarea
                  required
                  rows={2}
                  maxLength={500}
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                />
              </label>
              {status === "complete" && (
                <p className="meta">
                  All unfinished team tasks must be completed first. Other
                  organizations keep their own assignments.
                </p>
              )}
              <button className="secondary" disabled={pending}>
                {pending ? "Saving…" : "Save assignment progress"}
              </button>
            </form>
          </details>
        </>
      )}
    </div>
  );
}
