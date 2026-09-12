'use client';

import { ChevronDown, ChevronUp, List, MapIcon, X } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { CATEGORY_LABELS, PRIORITY_LABELS, type PublicIssue } from '@/contracts';
import { IssueList } from './IssueList';

export type SheetState = 'compact' | 'half' | 'expanded';
export type SheetView = 'map' | 'list';

type IssueSheetProps = {
  issues: PublicIssue[];
  selectedIssue: PublicIssue | null;
  /** More than one marker under the same tap: offer a choice instead of stacking targets. */
  overlappingIssues: PublicIssue[];
  state: SheetState;
  view: SheetView;
  mapAvailable: boolean;
  onStateChange: (state: SheetState) => void;
  onViewChange: (view: SheetView) => void;
  onSelect: (issueId: string) => void;
  onClearSelection: () => void;
};

const NEXT_STATE: Record<SheetState, SheetState> = { compact: 'half', half: 'expanded', expanded: 'expanded' };
const PREVIOUS_STATE: Record<SheetState, SheetState> = { expanded: 'half', half: 'compact', compact: 'compact' };

function SelectedIssue({ issue }: { issue: PublicIssue }) {
  return (
    <div className="selected-issue">
      <p className="meta">
        {CATEGORY_LABELS[issue.category]} · {issue.publicLocationLabel}
        {issue.locationPrecision === 'approximate' ? ' · Approximate location' : ''}
      </p>
      <h3 className="issue-title">{issue.title}</h3>
      <p className="status-line">
        <StatusPill status={issue.status} />
        {issue.reviewedPriority && issue.reviewedPriority !== 'standard' ? (
          <span className="priority-label">{PRIORITY_LABELS[issue.reviewedPriority]} · reviewed by an authority</span>
        ) : null}
      </p>
      <p className="issue-summary">{issue.summary}</p>
      <p className="next-step">
        {issue.publishedNextStep ?? 'Awaiting assignment. No authority has published a next step yet.'}
      </p>

      {issue.organizationProgress.length > 0 ? (
        <div className="organizations">
          <p className="section-title">
            {issue.organizationProgress.length} {issue.organizationProgress.length === 1 ? 'organization' : 'organizations'} involved
          </p>
          <ul>
            {issue.organizationProgress.map((organization) => (
              <li key={organization.organizationId}>
                <strong>{organization.organizationName}</strong>
                {organization.isLead ? ' (lead)' : ''} · {organization.progressText}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="meta">
        {issue.reference} · {issue.evidenceCount} {issue.evidenceCount === 1 ? 'contribution' : 'contributions'}
      </p>
      <button type="button" className="button-primary" disabled aria-disabled title="The full issue view arrives with the issue detail package">
        Open issue
      </button>
    </div>
  );
}

export function IssueSheet({
  issues,
  selectedIssue,
  overlappingIssues,
  state,
  view,
  mapAvailable,
  onStateChange,
  onViewChange,
  onSelect,
  onClearSelection,
}: IssueSheetProps) {
  const showingList = view === 'list' || !mapAvailable;
  const heading = overlappingIssues.length > 1 ? 'Issues at this point' : selectedIssue ? 'Selected issue' : 'Nearby issues';

  return (
    <section className="sheet" data-state={state} aria-label="Nearby issues">
      <div className="sheet-header">
        <h2 className="section-title">
          {heading}
          {!selectedIssue && overlappingIssues.length <= 1 ? <span className="count"> · {issues.length}</span> : null}
        </h2>
        <div className="sheet-actions">
          {selectedIssue ? (
            <button type="button" className="icon-button" onClick={onClearSelection} aria-label="Close selected issue">
              <X size={20} aria-hidden />
            </button>
          ) : null}
          {mapAvailable ? (
            <button
              type="button"
              className="icon-button"
              onClick={() => onViewChange(view === 'list' ? 'map' : 'list')}
              aria-label={view === 'list' ? 'Show map' : 'Show list'}
            >
              {view === 'list' ? <MapIcon size={20} aria-hidden /> : <List size={20} aria-hidden />}
            </button>
          ) : null}
          <button
            type="button"
            className="icon-button"
            onClick={() => onStateChange(PREVIOUS_STATE[state])}
            disabled={state === 'compact'}
            aria-label="Collapse sheet"
          >
            <ChevronDown size={20} aria-hidden />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => onStateChange(NEXT_STATE[state])}
            disabled={state === 'expanded'}
            aria-label="Expand sheet"
          >
            <ChevronUp size={20} aria-hidden />
          </button>
        </div>
      </div>

      <div className="sheet-body">
        {overlappingIssues.length > 1 ? (
          <IssueList issues={overlappingIssues} selectedId={selectedIssue?.id ?? null} emptyMessage="" onSelect={onSelect} />
        ) : selectedIssue ? (
          <SelectedIssue issue={selectedIssue} />
        ) : showingList ? (
          <IssueList
            issues={issues}
            selectedId={null}
            emptyMessage="No open issues in this area. Change the filters or report a problem."
            onSelect={onSelect}
          />
        ) : (
          <p className="empty-state">
            {issues.length === 0
              ? 'No open issues in this area. Change the filters or report a problem.'
              : 'Choose a marker, or open the list.'}
          </p>
        )}
      </div>

      <div className="sheet-footer">
        <button type="button" className="button-primary" disabled aria-disabled title="Reporting arrives with the reporting package">
          Report a problem
        </button>
      </div>
    </section>
  );
}
