import { useEffect, useState } from 'react';
import { EVENT_TYPE_OPTIONS, GOOGLE_EVENT_COLORS } from '../lib/google';
import { maxIsoDate, minIsoDate } from '../lib/date';
import type { GoogleCalendarEntry, PlannerEvent, PlannerEventDraft, PlannerEventType } from '../types';

interface EventModalProps {
  calendars: GoogleCalendarEntry[];
  mode: 'create' | 'edit';
  event: PlannerEvent | null;
  draft: PlannerEventDraft | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: PlannerEventDraft) => void;
  onAdopt?: (event: PlannerEvent) => void;
}

function inferColor(type: PlannerEventType): string {
  return EVENT_TYPE_OPTIONS.find((option) => option.value === type)?.defaultColorId ?? '10';
}

export function EventModal({
  calendars,
  mode,
  event,
  draft,
  saving,
  onClose,
  onSave,
  onAdopt,
}: EventModalProps) {
  const [formState, setFormState] = useState<PlannerEventDraft | null>(draft);

  useEffect(() => {
    setFormState(draft);
  }, [draft]);

  useEffect(() => {
    if (!formState) {
      return;
    }

    const handleKeyDown = (eventKey: KeyboardEvent) => {
      if (eventKey.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formState, onClose]);

  if (!formState) {
    return null;
  }

  const readonly = mode === 'edit' && event?.readOnly;
  const title = mode === 'create' ? 'Create planner event' : readonly ? 'Event details' : 'Edit planner event';

  return (
    <div className="modal-scrim" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(eventClick) => eventClick.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">{mode === 'create' ? 'New item' : event?.calendarSummary ?? 'Event'}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span>Calendar</span>
            <select
              className="input"
              value={formState.calendarId}
              disabled={readonly}
              onChange={(inputEvent) =>
                setFormState((current) => (current ? { ...current, calendarId: inputEvent.target.value } : current))
              }
            >
              {calendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Title</span>
            <input
              className="input"
              type="text"
              value={formState.title}
              readOnly={readonly}
              onChange={(inputEvent) =>
                setFormState((current) => (current ? { ...current, title: inputEvent.target.value } : current))
              }
            />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Start date</span>
              <input
                className="input"
                type="date"
                value={formState.startDate}
                readOnly={readonly}
                onChange={(inputEvent) =>
                  setFormState((current) =>
                    current
                      ? {
                          ...current,
                          startDate: minIsoDate(inputEvent.target.value, current.endDate),
                        }
                      : current,
                  )
                }
              />
            </label>

            <label className="field">
              <span>End date</span>
              <input
                className="input"
                type="date"
                value={formState.endDate}
                readOnly={readonly}
                onChange={(inputEvent) =>
                  setFormState((current) =>
                    current
                      ? {
                          ...current,
                          endDate: maxIsoDate(inputEvent.target.value, current.startDate),
                        }
                      : current,
                  )
                }
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Type</span>
              <select
                className="input"
                value={formState.type}
                disabled={readonly}
                onChange={(inputEvent) => {
                  const nextType = inputEvent.target.value as PlannerEventType;
                  setFormState((current) =>
                    current
                      ? {
                          ...current,
                          type: nextType,
                          colorId: inferColor(nextType),
                        }
                      : current,
                  );
                }}
              >
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Color</span>
              <select
                className="input"
                value={formState.colorId}
                disabled={readonly}
                onChange={(inputEvent) =>
                  setFormState((current) => (current ? { ...current, colorId: inputEvent.target.value } : current))
                }
              >
                {Object.entries(GOOGLE_EVENT_COLORS).map(([colorId, color]) => (
                  <option key={colorId} value={colorId}>
                    {color.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Location</span>
            <input
              className="input"
              type="text"
              value={formState.location}
              readOnly={readonly}
              onChange={(inputEvent) =>
                setFormState((current) => (current ? { ...current, location: inputEvent.target.value } : current))
              }
            />
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea
              className="input textarea"
              value={formState.notes}
              readOnly={readonly}
              onChange={(inputEvent) =>
                setFormState((current) => (current ? { ...current, notes: inputEvent.target.value } : current))
              }
            />
          </label>
        </div>

        <div className="modal-actions">
          {readonly && event && onAdopt ? (
            <button type="button" className="button button-primary" onClick={() => onAdopt(event)} disabled={saving}>
              {saving ? 'Adopting…' : 'Adopt into YearPlan'}
            </button>
          ) : (
            <button
              type="button"
              className="button button-primary"
              onClick={() => formState && onSave(formState)}
              disabled={saving || !formState.title.trim()}
            >
              {saving ? 'Saving…' : mode === 'create' ? 'Create event' : 'Save changes'}
            </button>
          )}

          <button type="button" className="button button-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
