import type { GoogleCalendarEntry } from '../types';

interface CalendarPickerProps {
  calendars: GoogleCalendarEntry[];
  selectedCalendarIds: string[];
  onToggleCalendar: (calendarId: string) => void;
  onContinue: () => void;
}

export function CalendarPicker({
  calendars,
  selectedCalendarIds,
  onToggleCalendar,
  onContinue,
}: CalendarPickerProps) {
  return (
    <section className="panel picker-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 1</p>
          <h2>Pick the calendars to plan against</h2>
        </div>
        <p className="muted">
          YearPlan reads and writes directly to your existing Google Calendars. Choose the calendars that should participate
          in the planner.
        </p>
      </div>

      <div className="calendar-picker-list">
        {calendars.map((calendar) => {
          const selected = selectedCalendarIds.includes(calendar.id);

          return (
            <label key={calendar.id} className={`calendar-pill ${selected ? 'is-selected' : ''}`}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleCalendar(calendar.id)}
              />
              <span className="calendar-pill-dot" style={{ backgroundColor: calendar.backgroundColor ?? '#2f6fed' }} />
              <span className="calendar-pill-copy">
                <strong>{calendar.summary}</strong>
                {calendar.primary ? <span>Primary calendar</span> : <span>Google Calendar</span>}
              </span>
            </label>
          );
        })}
      </div>

      <div className="picker-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={onContinue}
          disabled={selectedCalendarIds.length === 0}
        >
          Continue to planner
        </button>
      </div>
    </section>
  );
}
