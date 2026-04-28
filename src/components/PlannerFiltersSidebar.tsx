import { EVENT_TYPE_OPTIONS } from '../lib/google';
import type { GoogleCalendarEntry, PlannerEventType } from '../types';

interface PlannerFiltersSidebarProps {
  calendars: GoogleCalendarEntry[];
  calendarFilters: string[];
  onManageCalendars: () => void;
  onToggleCalendarFilter: (calendarId: string) => void;
  onToggleTypeFilter: (type: PlannerEventType) => void;
  typeFilters: PlannerEventType[];
}

export function PlannerFiltersSidebar({
  calendars,
  calendarFilters,
  onManageCalendars,
  onToggleCalendarFilter,
  onToggleTypeFilter,
  typeFilters,
}: PlannerFiltersSidebarProps) {
  return (
    <aside className="rail rail-right">
      <div className="rail-card">
        <div className="rail-card-header">
          <strong>Calendars</strong>
          <button type="button" className="rail-link" onClick={onManageCalendars}>
            Manage
          </button>
        </div>
        <div className="rail-stack">
          {calendars.map((calendar) => {
            const enabled = calendarFilters.includes(calendar.id);
            return (
              <button
                key={calendar.id}
                type="button"
                className={`rail-item ${enabled ? 'is-active' : ''}`}
                onClick={() => onToggleCalendarFilter(calendar.id)}
              >
                <span className="rail-item-dot" style={{ backgroundColor: calendar.backgroundColor ?? '#3f74f6' }} />
                <span className="rail-item-copy">
                  <strong>{calendar.summary}</strong>
                  <span>{calendar.primary ? 'Primary' : 'Google Calendar'}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
