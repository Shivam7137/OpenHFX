'use client';

import { CATEGORIES, CATEGORY_LABELS, type Category } from '@/contracts';

export type CategoryFilter = Category | 'all';

type CategoryFiltersProps = {
  value: CategoryFilter;
  showResolved: boolean;
  onChange: (value: CategoryFilter) => void;
  onShowResolvedChange: (value: boolean) => void;
};

export function CategoryFilters({ value, showResolved, onChange, onShowResolvedChange }: CategoryFiltersProps) {
  return (
    <div className="filter-row" role="group" aria-label="Filter issues">
      <div className="filter-scroll">
        <button
          type="button"
          className="filter-chip"
          aria-pressed={value === 'all'}
          onClick={() => onChange('all')}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className="filter-chip"
            aria-pressed={value === category}
            onClick={() => onChange(category)}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
        <button
          type="button"
          className="filter-chip"
          aria-pressed={showResolved}
          onClick={() => onShowResolvedChange(!showResolved)}
        >
          Resolved
        </button>
      </div>
    </div>
  );
}
