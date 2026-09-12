"use client";
import { type ListEnvelope, type WorkTask } from "@/contracts";
import { usePoll } from "@/components/api";
import { useSession, SignInRequired } from "@/components/shell";
import { EmptyState, ErrorNotice, SyncStatus } from "@/components/ui";
import { TaskProgress } from "./TaskProgress";
export function WorkList() {
  const { session } = useSession();
  const poll = usePoll<ListEnvelope<WorkTask>>(
    session?.user && session.user.role !== "resident"
      ? "/authority/work"
      : null,
  );
  if (!session?.user || session.user.role === "resident")
    return <SignInRequired authority />;
  return (
    <div className="page reading">
      <p className="muted">{session.user.displayName}</p>
      <h1>
        {session.user.role === "coordinator" ? "Organization work" : "My work"}
      </h1>
      <p className="muted">Know the next step. Record what happens.</p>
      <SyncStatus {...poll} />
      <ErrorNotice message={poll.error} retry={poll.refresh} />
      {poll.data?.items.length === 0 && (
        <EmptyState title="No work assigned to you">
          Your assigned tasks will appear here.
        </EmptyState>
      )}
      {poll.data?.items.map((t) => (
        <TaskProgress key={t.id} task={t} refresh={poll.refresh} link />
      ))}
    </div>
  );
}
