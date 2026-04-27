import { EVENT_TYPE_OPTIONS } from '../lib/google';
import { getMonthLabel, listMonths } from '../lib/date';
import type { CalendarView, GoogleCalendarEntry, PlannerEventType } from '../types';

interface PlannerToolbarProps {
  calendars: GoogleCalendarEntry[];
  calendarFilters: string[];
  monthIndex: number;
  selectedCalendarIds: string[];
  typeFilters: PlannerEventType[];
  view: CalendarView;
  year: number;
  onSetView: (view: CalendarView) => void;
  onSetMonth: (monthIndex: number) => void;
  onShiftYear: (delta: number) => void;
  onToggleCalendarFilter: (calendarId: string) => void;
  onToggleTypeFilter: (type: PlannerEventType) => void;
  onRefresh: () => void;
  onManageCalendars: () => void;
  loading: boolean;
}

export function PlannerToolbar({
  calendars,
  calendarFilters,
  monthIndex,
  selectedCalendarIds,
  typeFilters,
  view,
  year,
  onSetView,
  onSetMonth,
  onShiftYear,
  onToggleCalendarFilter,
  onToggleTypeFilter,
  onRefresh,
  onManageCalendars,
  loading,
}: PlannerToolbarProps) {
  const visibleCalendars = calendars.filter((calendar) => selectedCalendarIds.includes(calendar.id));

  return (
    <header className="planner-toolbar panel">
      <div className="toolbar-row">
        <div>
          <p className="eyebrow">YearPlan</p>
          <h1>{view === 'year' ? `${year} at a glance` : getMonthLabel(year, monthIndex)}</h1>
        </div>

        <div className="toolbar-actions">
          <div className="segmented-control">
            <button
              type="button"
              className={view === 'year' ? 'is-active' : ''}
              onClick={() => onSetView('year')}
            >
              Year
            </button>
            <button
              type="button"
              className={view === 'month' ? 'is-active' : ''}
              onClick={() => onSetView('month')}
            >
              Month
            </button>
          </div>

          <div className="year-switcher">
            <button type="button" className="button button-ghost" onClick={() => onShiftYear(-1)}>
              Prev year
            </button>
            <strong>{year}</strong>
            <button type="button" className="button button-ghost" onClick={() => onShiftYear(1)}>
              Next year
            </button>
          </div>

          {view === 'month' ? (
            <select
              className="input"
              value={monthIndex}
              onChange={(event) => onSetMonth(Number(event.target.value))}
            >
              {listMonths().map((index) => (
                <option key={index} value={index}>
                  {getMonthLabel(year, index)}
                </option>
              ))}
            </select>
          ) : null}

          <button type="button" className="button button-primary" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="button button-ghost" onClick={onManageCalendars}>
            Calendars
          </button>
        </div>
      </div>

      <div className="toolbar-row toolbar-row-filters">
        <div className="filter-group">
          <span className="filter-label">Calendars</span>
          {visibleCalendars.map((calendar) => {
            const enabled = calendarFilters.includes(calendar.id);
            return (
              <button
                key={calendar.id}
                type="button"
                className={`filter-chip ${enabled ? 'is-enabled' : ''}`}
                onClick={() => onToggleCalendarFilter(calendar.id)}
              >
                <span className="filter-chip-dot" style={{ backgroundColor: calendar.backgroundColor ?? '#3f74f6' }} />
                {calendar.summary}
              </button>
            );
          })}
        </div>

        <div className="filter-group">
          <span className="filter-label">Types</span>
          {EVENT_TYPE_OPTIONS.map((typeOption) => {
            const enabled = typeFilters.includes(typeOption.value);
            return (
              <button
                key={typeOption.value}
                type="button"
                className={`filter-chip ${enabled ? 'is-enabled' : ''}`}
                onClick={() => onToggleTypeFilter(typeOption.value)}
              >
                <span className="filter-chip-dot" style={{ backgroundColor: `var(--type-${typeOption.value})` }} />
                {typeOption.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
