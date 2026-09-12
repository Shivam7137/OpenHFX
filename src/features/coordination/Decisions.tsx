"use client";
import { useState } from "react";
import type { IssueDetail, Priority } from "@/contracts";
import { useSession } from "@/components/shell";
import { errorMessage, mutate } from "@/components/api";
import { ErrorNotice, Notice, Sheet } from "@/components/ui";
const labels: Record<string, string> = {
  acknowledge: "Acknowledge issue",
  set_priority: "Review priority",
  release_requirement: "Release a requirement",
  nominate_lead: "Nominate a new lead",
  accept_lead: "Accept lead nomination",
  resolve: "Resolve issue",
  accept_reopen: "Accept reopening request",
};
export function Decisions({
  issue,
  refresh,
}: {
  issue: IssueDetail;
  refresh: () => Promise<void>;
}) {
  const { session } = useSession();
  const lead = issue.leadOrganizationId === session?.user?.organizationId;
  const participating = issue.assignments?.some(
    (a) =>
      a.organizationId === session?.user?.organizationId &&
      a.status !== "withdrawn",
  );
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const [priority, setPriority] = useState<Priority>("standard");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unfinished =
    issue.assignments?.filter((a) => a.required && a.status !== "complete") ||
    [];
  const actions = [
    ...(issue.status === "reported" ? ["acknowledge"] : []),
    ...(participating ? ["set_priority"] : []),
    ...(lead && issue.status !== "resolved"
      ? ["release_requirement", "nominate_lead", "resolve"]
      : []),
    ...(participating && !lead ? ["accept_lead"] : []),
    ...(lead &&
    issue.status === "resolved" &&
    issue.reopenRequests?.some((r) => !r.accepted)
      ? ["accept_reopen"]
      : []),
  ];
  async function save() {
    setPending(true);
    setError(null);
    try {
      await mutate(`/authority/issues/${issue.id}/decisions`, {
        action,
        reason,
        expectedVersion: issue.version,
        ...(action === "set_priority" ? { priority } : {}),
        ...(action === "release_requirement" ? { assignmentId: target } : {}),
        ...(action === "nominate_lead" ? { targetOrganizationId: target } : {}),
        ...(action === "accept_reopen" ? { requestId: target } : {}),
      });
      setAction("");
      setReason("");
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
      await refresh();
    } finally {
      setPending(false);
    }
  }
  if (!actions.length) return null;
  return (
    <div className="decision-panel">
      <h3>Authority decisions</h3>
      <div className="decision-buttons">
        {actions.map((value) => (
          <button
            key={value}
            className="secondary"
            onClick={() => {
              setAction(value);
              setReason("");
              setTarget("");
              setError(null);
            }}
          >
            {labels[value]}
          </button>
        ))}
      </div>
      <Sheet
        title={labels[action] || "Authority decision"}
        description="This records an authority decision on the shared issue. Review the current response before confirming."
        open={!!action}
        onOpenChange={(open) => {
          if (!open && !pending) setAction("");
        }}
      >
        <ErrorNotice message={error} />
        {action === "resolve" && unfinished.length > 0 && (
          <Notice>
            Resolve is blocked by {unfinished.length} unfinished required{" "}
            {unfinished.length === 1 ? "assignment" : "assignments"}:
            <ul>
              {unfinished.map((a) => (
                <li key={a.id}>
                  {a.organizationName}: {a.purpose}
                </li>
              ))}
            </ul>
            Complete the assignments, or release a requirement with a public
            explanation.
          </Notice>
        )}
        {action === "accept_lead" && (
          <Notice>
            You can accept only a nomination recorded by the current lead. The
            current lead remains responsible until acceptance.
          </Notice>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {action === "set_priority" && (
            <label>
              Reviewed priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="standard">Standard</option>
                <option value="priority">Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          )}
          {action === "release_requirement" && (
            <label>
              Required assignment
              <select
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Choose an assignment</option>
                {unfinished.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.organizationName}
                  </option>
                ))}
              </select>
            </label>
          )}
          {action === "nominate_lead" && (
            <label>
              Incoming lead organization
              <select
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Choose a participating organization</option>
                {issue.assignments
                  ?.filter(
                    (a) =>
                      a.organizationId !== issue.leadOrganizationId &&
                      a.status !== "withdrawn",
                  )
                  .map((a) => (
                    <option key={a.id} value={a.organizationId}>
                      {a.organizationName}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {action === "accept_reopen" && (
            <label>
              Reopening request
              <select
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Choose a request</option>
                {issue.reopenRequests
                  ?.filter((r) => !r.accepted)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.reason}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            {action === "resolve"
              ? "Public resolution note"
              : "Reason / public explanation"}
            <textarea
              required
              maxLength={2000}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="button full"
            disabled={
              pending || (action === "resolve" && unfinished.length > 0)
            }
          >
            {pending ? "Saving…" : labels[action]}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
