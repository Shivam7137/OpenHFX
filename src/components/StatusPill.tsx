import { CircleCheckBig, CircleDot, ClipboardCheck, Eye, Hammer } from 'lucide-react';
import type { ComponentType } from 'react';
import { ISSUE_STATUS_LABELS, type IssueStatus } from '@/contracts';

// The shared lifecycle indicator for both experiences. Status always pairs an
// icon with its text; colour never carries the meaning on its own.

const STATUS_ICONS: Record<IssueStatus, ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  reported: CircleDot,
  acknowledged: Eye,
  assigned: ClipboardCheck,
  in_progress: Hammer,
  resolved: CircleCheckBig,
};

export function StatusPill({ status }: { status: IssueStatus }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span className="status-pill" data-status={status}>
      <Icon size={16} aria-hidden />
      {ISSUE_STATUS_LABELS[status]}
    </span>
  );
}
