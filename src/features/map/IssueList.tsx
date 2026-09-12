'use client';

import { StatusPill } from '@/components/StatusPill';
import { CATEGORY_LABELS, type PublicIssue } from '@/contracts';

type IssueListProps = {
  issues: PublicIssue[];
  selectedId: string | null;
  emptyMessage: string;
  onSelect: (issueId: string) => void;
};

/** The keyboard and no-basemap route to every issue the map shows. */
export function IssueList({ issues, selectedId, emptyMessage, onSelect }: IssueListProps) {
  if (issues.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <ul className="issue-list">
      {issues.map((issue) => (
        <li key={issue.id}>
          <button
            type="button"
            className="issue-row"
            aria-current={issue.id === selectedId ? 'true' : undefined}
            onClick={() => onSelect(issue.id)}
          >
            <span className="issue-row-heading">
              <span className="issue-row-title">{issue.title}</span>
              <StatusPill status={issue.status} />
            </span>
            <span className="meta">
              {CATEGORY_LABELS[issue.category]} · {issue.publicLocationLabel}
              {issue.locationPrecision === 'approximate' ? ' · Approximate location' : ''}
            </span>
            {issue.publishedNextStep ? <span className="issue-row-next">{issue.publishedNextStep}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
