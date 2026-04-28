import { EVENT_TYPE_OPTIONS } from '../lib/google';
import type { PlannerEventType } from '../types';

interface PlannerFiltersSidebarProps {
  onToggleTypeFilter: (type: PlannerEventType) => void;
  typeFilters: PlannerEventType[];
}

export function PlannerFiltersSidebar({
  onToggleTypeFilter,
  typeFilters,
}: PlannerFiltersSidebarProps) {
  return (
    <aside className="rail rail-right">
      <div className="rail-card">
        <div className="rail-card-header">
          <strong>Types</strong>
        </div>
        <div className="rail-stack">
          {EVENT_TYPE_OPTIONS.map((typeOption) => {
            const enabled = typeFilters.includes(typeOption.value);
            return (
              <button
                key={typeOption.value}
                type="button"
                className={`rail-item ${enabled ? 'is-active' : ''}`}
                onClick={() => onToggleTypeFilter(typeOption.value)}
              >
                <span className="rail-item-dot" style={{ backgroundColor: `var(--type-${typeOption.value})` }} />
                <span className="rail-item-copy">
                  <strong>{typeOption.label}</strong>
                  <span>{enabled ? 'Visible' : 'Hidden'}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
