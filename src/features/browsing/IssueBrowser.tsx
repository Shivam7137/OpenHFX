"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Plus, List, MapPinned } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type IssueSummary,
  type ListEnvelope,
  type Organization,
} from "@/contracts";
import { usePoll } from "@/components/api";
import { useSession, SignInRequired } from "@/components/shell";
import { EmptyState, ErrorNotice, IssueRow, SyncStatus } from "@/components/ui";
import { MapPlaceholder } from "@/features/map/MapPlaceholder";

export function IssueBrowser({ authority = false }: { authority?: boolean }) {
  const { session } = useSession();
  const [category, setCategory] = useState<Category | "">("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("relevant");
  const [showMap, setShowMap] = useState(!authority);
  const [selected, setSelected] = useState<string | null>(null);
  const canRead = !authority || session?.user?.role === "coordinator";
  const poll = usePoll<ListEnvelope<IssueSummary>>(
    canRead
      ? authority
        ? `/authority/inbox?scope=${scope}`
        : "/issues"
      : null,
  );
  const organizations = usePoll<ListEnvelope<Organization>>(
    authority ? "/organizations" : null,
  );
  const items = (poll.data?.items || []).filter(
    (issue) =>
      (!category || issue.category === category) &&
      (!query ||
        `${issue.title} ${issue.publicLocationLabel}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  if (authority && !session?.user) return <SignInRequired authority />;
  if (authority && session?.user?.role !== "coordinator")
    return (
      <div className="page narrow">
        <h1>Your assigned work</h1>
        <p>
          The organization inbox is for coordinators. Your work is available in
          My work.
        </p>
        <Link className="button" href="/authority/work">
          View my work
        </Link>
      </div>
    );
  return (
    <div className={`browse-page ${authority ? "authority-browser" : ""}`}>
      <div className="browse-heading">
        <div>
          <p className="muted">
            {authority
              ? organizations.data?.items.find(
                  (o) => o.id === session?.user?.organizationId,
                )?.name || "Response workspace"
              : "Halifax neighbourhoods"}
          </p>
          <h1>{authority ? "Inbox" : "A clearer view of nearby"}</h1>
        </div>
        {!authority && (
          <Link className="button desktop-report" href="/public/report">
            <Plus size={20} />
            Report a problem
          </Link>
        )}
      </div>
      <div className="browse-controls">
        {authority && (
          <div className="segmented">
            <button
              aria-pressed={scope === "relevant"}
              onClick={() => setScope("relevant")}
            >
              Relevant
            </button>
            <button
              aria-pressed={scope === "assigned"}
              onClick={() => setScope("assigned")}
            >
              Assigned
            </button>
          </div>
        )}
        <label className="search-field">
          <Search size={20} />
          <span className="sr-only">Search issues or places</span>
          <input
            type="search"
            placeholder="Search issues or places"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="filter-row" aria-label="Issue category">
          <button
            className={!category ? "selected" : ""}
            aria-pressed={!category}
            onClick={() => setCategory("")}
          >
            All issues
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={category === c ? "selected" : ""}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>
      <div className={`browse-layout ${showMap ? "" : "list-only"}`}>
        {showMap && (
          <div className="browse-map">
            <MapPlaceholder
              issues={items}
              selectedIssueId={selected}
              onSelect={setSelected}
            />
          </div>
        )}
        <section className="issue-panel">
          <div className="panel-header">
            <div>
              <h2>{authority ? "Organization work" : "Nearby issues"}</h2>
              <span className="meta">
                {items.length} {items.length === 1 ? "issue" : "issues"} in this
                view
              </span>
            </div>
            <button
              className="secondary compact-button"
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? <List size={18} /> : <MapPinned size={18} />}{" "}
              {showMap ? "List" : "Map"}
            </button>
          </div>
          <SyncStatus {...poll} />
          <ErrorNotice message={poll.error} retry={poll.refresh} />
          {!poll.data && !poll.error && (
            <div className="empty-state">Loading issues…</div>
          )}
          {poll.data && !items.length && (
            <EmptyState title="No issues in this view">
              Try another category or search term.
            </EmptyState>
          )}
          {[...items]
            .sort((a, b) =>
              a.id === selected ? -1 : b.id === selected ? 1 : 0,
            )
            .map((issue) => (
              <IssueRow key={issue.id} issue={issue} authority={authority} />
            ))}
          {!authority && (
            <div className="panel-footer">
              <Link className="button full" href="/public/report">
                <Plus size={20} />
                Report a problem
              </Link>
              <p className="meta">A shared thread. A visible response.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
