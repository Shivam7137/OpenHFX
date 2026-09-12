"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  MapPin,
  X,
  TreePine,
  Accessibility,
  Construction,
  Lamp,
  Trash2,
  MessageSquare,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  type Category,
  type IssueSummary,
} from "@/contracts";

export function ErrorNotice({
  message,
  retry,
}: {
  message: string | null;
  retry?: () => void;
}) {
  return message ? (
    <div className="notice error" role="alert">
      <AlertCircle size={20} />
      <div>
        {message}
        {retry && (
          <button className="text-button" onClick={retry}>
            Retry
          </button>
        )}
      </div>
    </div>
  ) : null;
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <AlertCircle size={20} />
      <div>{children}</div>
    </div>
  );
}
export function SyncStatus({
  syncedAt,
  offline,
  error,
  refresh,
}: {
  syncedAt: number | null;
  offline: boolean;
  error: string | null;
  refresh: () => void;
}) {
  const stale = syncedAt && Date.now() - syncedAt > 30000;
  return (
    <div
      className={`sync-status ${offline || stale || error ? "delayed" : ""}`}
    >
      <Clock3 size={14} />
      <span>
        {offline
          ? "Offline. Showing saved results"
          : stale || error
            ? "Updates delayed"
            : syncedAt
              ? "Updates every 3 seconds"
              : "Connecting to updates…"}
        {syncedAt && (
          <time
            dateTime={new Date(syncedAt).toISOString()}
            title={new Date(syncedAt).toLocaleString()}
          >
            {" "}
            · Last synced{" "}
            {new Date(syncedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </time>
        )}
      </span>
      {(error || offline || stale) && (
        <button className="text-button" onClick={refresh}>
          Retry
        </button>
      )}
    </div>
  );
}
export function Status({ status }: { status: keyof typeof STATUS_LABELS }) {
  return (
    <span className={`status status-${status}`}>
      {status === "resolved" || status === "complete" ? (
        <Check size={14} />
      ) : (
        <Circle size={12} />
      )}{" "}
      {STATUS_LABELS[status]}
    </span>
  );
}
const icons = {
  trees: TreePine,
  access: Accessibility,
  roads: Construction,
  lighting: Lamp,
  waste: Trash2,
  other: MessageSquare,
};
export function CategoryIcon({ category }: { category: Category }) {
  const Icon = icons[category];
  return (
    <span className={`category-icon category-${category}`}>
      <Icon size={22} />
    </span>
  );
}
export function IssueRow({
  issue,
  authority = false,
}: {
  issue: IssueSummary;
  authority?: boolean;
}) {
  return (
    <Link
      className="issue-row"
      href={`/${authority ? "authority" : "public"}/issues/${issue.id}`}
    >
      <CategoryIcon category={issue.category} />
      <div className="issue-row-content">
        <div className="row-between">
          <span className="meta">
            {CATEGORY_LABELS[issue.category]}
            {issue.isDemo && " · Demo"}
          </span>
          <Status status={issue.status} />
        </div>
        <h3>{issue.title}</h3>
        <p className="place">
          <MapPin size={14} />
          {issue.publicLocationLabel}
        </p>
        <p className="meta">
          {authority
            ? issue.leadOrganizationName || "Awaiting assignment"
            : issue.nextStep || "Awaiting authority review"}
        </p>
        {issue.priorityReviewed && issue.priority !== "standard" && (
          <span className="priority">
            {issue.priority === "urgent" ? "Urgent" : "Priority"} · Authority
            reviewed
          </span>
        )}
      </div>
      <ChevronRight size={18} />
    </Link>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Sheet({
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="row-between">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close">
              <X size={22} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted">
            {description}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Time({ date }: { date: string }) {
  return (
    <time className="meta" dateTime={date}>
      {new Date(date).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </time>
  );
}
