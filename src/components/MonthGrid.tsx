import { useEffect } from 'react';
import { buildMonthLayout } from '../lib/layout';
import { GOOGLE_EVENT_COLORS } from '../lib/google';
import { compareIsoDate, getMonthLabel, getMonthShortLabel, isSameMonth } from '../lib/date';
import type { EventSegment, PlannerEvent, PlannerEventDraft } from '../types';

interface DragInteractionState {
  kind: 'move' | 'resize-start' | 'resize-end';
  eventId: string;
  anchorDate: string;
  baseStartDate: string;
  baseEndDate: string;
  hoverDate: string;
}

interface SelectionState {
  startDate: string;
  endDate: string;
}

interface MonthGridProps {
  year: number;
  monthIndex: number;
  events: PlannerEvent[];
  compact?: boolean;
  variant?: 'card' | 'flat';
  interactive?: boolean;
  draggingState: DragInteractionState | null;
  selection: SelectionState | null;
  onOpenEvent: (event: PlannerEvent) => void;
  onStartSelection?: (date: string) => void;
  onHoverDate?: (date: string) => void;
  onCommitSelection?: () => void;
  onStartInteraction?: (interaction: DragInteractionState) => void;
  onCommitInteraction?: () => void;
  getPreviewDraft?: (eventId: string) => PlannerEventDraft | null;
}

const COMPACT_WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FULL_WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function eventBarStyle(event: PlannerEvent): React.CSSProperties {
  const color = GOOGLE_EVENT_COLORS[event.colorId] ?? GOOGLE_EVENT_COLORS['10'];
  return {
    backgroundColor: color.background,
    color: color.foreground,
  };
}

function getSelectionStateClass(date: string, selection: SelectionState | null): string {
  if (!selection) {
    return '';
  }
  const rangeStart = selection.startDate <= selection.endDate ? selection.startDate : selection.endDate;
  const rangeEnd = selection.startDate <= selection.endDate ? selection.endDate : selection.startDate;
  return compareIsoDate(date, rangeStart) >= 0 && compareIsoDate(date, rangeEnd) <= 0 ? 'is-selected' : '';
}

function buildPreviewEvent(event: PlannerEvent, draft: PlannerEventDraft | null): PlannerEvent {
  if (!draft) {
    return event;
  }
  return {
    ...event,
    startDate: draft.startDate,
    endDate: draft.endDate,
    title: draft.title,
    colorId: draft.colorId,
    location: draft.location,
    notes: draft.notes,
    type: draft.type,
  };
}

export function MonthGrid({
  year,
  monthIndex,
  events,
  compact = false,
  variant = 'card',
  interactive = false,
  draggingState,
  selection,
  onOpenEvent,
  onStartSelection,
  onHoverDate,
  onCommitSelection,
  onStartInteraction,
  onCommitInteraction,
  getPreviewDraft,
}: MonthGridProps) {
  useEffect(() => {
    if (!interactive) {
      return;
    }

    const handlePointerUp = () => {
      if (draggingState && onCommitInteraction) {
        onCommitInteraction();
        return;
      }

      if (selection && onCommitSelection) {
        onCommitSelection();
      }
    };

    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [draggingState, interactive, onCommitInteraction, onCommitSelection, selection]);

  const previewEvents = events.map((event) => buildPreviewEvent(event, getPreviewDraft?.(event.id) ?? null));
  const layout = buildMonthLayout(year, monthIndex, previewEvents);
  const eventsById = new Map(previewEvents.map((event) => [event.id, event]));
  const isFlat = variant === 'flat';
  const dayCellClassName = `day-cell${compact ? ' day-cell-compact' : ''}${isFlat ? ' day-cell-flat' : ''}`;
  const weekdayLabels = isFlat ? FULL_WEEKDAY_LABELS : COMPACT_WEEKDAY_LABELS;
  const headerLabel = isFlat ? getMonthLabel(year, monthIndex) : getMonthShortLabel(monthIndex);

  return (
    <section className={`month-card ${compact ? 'month-card-compact' : 'month-card-expanded'} ${isFlat ? 'month-card-flat' : ''}`}>
      <header className="month-card-header">
        <h3>{headerLabel}</h3>
      </header>

      <div className={`month-weekday-row ${isFlat ? 'month-weekday-row-flat' : ''}`}>
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className={`month-weeks ${isFlat ? 'month-weeks-flat' : ''}`}>
        {layout.weeks.map((week, weekIndex) => {
          const segments = layout.segmentsByWeek[weekIndex];
          const laneCount = Math.max(layout.laneCounts[weekIndex], 1);

          return (
            <div
              key={week.start}
              className={`week-row ${isFlat ? 'week-row-flat' : ''}`}
              style={
                {
                  '--week-lanes': laneCount,
                } as React.CSSProperties
              }
            >
              <div className="week-days">
                {week.days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`${dayCellClassName} ${isSameMonth(day, year, monthIndex) ? '' : 'is-outside'} ${getSelectionStateClass(day, selection)}`}
                    onPointerDown={() => onStartSelection?.(day)}
                    onPointerEnter={() => onHoverDate?.(day)}
                  >
                    <span className="day-number">{Number(day.slice(-2))}</span>
                  </button>
                ))}
              </div>

              <div className={`week-bars ${isFlat ? 'week-bars-flat' : ''}`}>
                {segments.map((segment) => {
                  const event = eventsById.get(segment.eventId);
                  if (!event) {
                    return null;
                  }

                  return (
                    <MonthGridEventBar
                      key={segment.key}
                      compact={compact}
                      flat={isFlat}
                      event={event}
                      segment={segment}
                      interactive={interactive && !event.readOnly}
                      onOpenEvent={onOpenEvent}
                      onHoverDate={onHoverDate}
                      onStartInteraction={onStartInteraction}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface MonthGridEventBarProps {
  compact: boolean;
  flat: boolean;
  event: PlannerEvent;
  segment: EventSegment;
  interactive: boolean;
  onOpenEvent: (event: PlannerEvent) => void;
  onHoverDate?: (date: string) => void;
  onStartInteraction?: (interaction: DragInteractionState) => void;
}

function MonthGridEventBar({
  compact,
  flat,
  event,
  segment,
  interactive,
  onOpenEvent,
  onHoverDate,
  onStartInteraction,
}: MonthGridEventBarProps) {
  const daySpan = segment.endColumn - segment.startColumn + 1;

  return (
    <div
      className={`event-bar ${compact ? 'event-bar-compact' : ''} ${flat ? 'event-bar-flat' : ''} ${event.readOnly ? 'is-readonly' : ''}`}
      style={
        {
          ...eventBarStyle(event),
          '--bar-start': String(segment.startColumn + 1),
          '--bar-span': String(daySpan),
          '--bar-lane': String(segment.lane + 1),
        } as React.CSSProperties
      }
      onClick={() => onOpenEvent(event)}
    >
      {interactive ? (
        <button
          type="button"
          className="event-handle event-handle-start"
          aria-label="Resize event start"
          onPointerDown={(pointerEvent) => {
            pointerEvent.stopPropagation();
            pointerEvent.preventDefault();
            onStartInteraction?.({
              kind: 'resize-start',
              eventId: event.id,
              anchorDate: segment.startDate,
              baseStartDate: event.startDate,
              baseEndDate: event.endDate,
              hoverDate: segment.startDate,
            });
            onHoverDate?.(segment.startDate);
          }}
        />
      ) : null}

      <button
        type="button"
        className="event-body"
        style={eventBarStyle(event)}
        onPointerDown={(pointerEvent) => {
          if (!interactive) {
            return;
          }

          pointerEvent.stopPropagation();
          pointerEvent.preventDefault();

          const rect = (pointerEvent.currentTarget as HTMLButtonElement).getBoundingClientRect();
          const pointerRatio = rect.width > 0 ? (pointerEvent.clientX - rect.left) / rect.width : 0;
          const dayOffset = Math.max(0, Math.min(daySpan - 1, Math.floor(pointerRatio * daySpan)));
          const anchorDay = new Date(`${segment.startDate}T00:00:00Z`);
          anchorDay.setUTCDate(anchorDay.getUTCDate() + dayOffset);
          const anchorDate = anchorDay.toISOString().slice(0, 10);

          onStartInteraction?.({
            kind: 'move',
            eventId: event.id,
            anchorDate,
            baseStartDate: event.startDate,
            baseEndDate: event.endDate,
            hoverDate: anchorDate,
          });
        }}
      >
        <span>{event.title}</span>
      </button>

      {interactive ? (
        <button
          type="button"
          className="event-handle event-handle-end"
          aria-label="Resize event end"
          onPointerDown={(pointerEvent) => {
            pointerEvent.stopPropagation();
            pointerEvent.preventDefault();
            onStartInteraction?.({
              kind: 'resize-end',
              eventId: event.id,
              anchorDate: segment.endDate,
              baseStartDate: event.startDate,
              baseEndDate: event.endDate,
              hoverDate: segment.endDate,
            });
            onHoverDate?.(segment.endDate);
          }}
        />
      ) : null}
    </div>
  );
}
