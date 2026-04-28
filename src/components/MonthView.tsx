import { useEffect, useMemo, useRef } from 'react';
import { listMonths } from '../lib/date';
import type { PlannerEvent, PlannerEventDraft } from '../types';
import { MonthGrid } from './MonthGrid';

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

interface MonthViewProps {
  year: number;
  monthIndex: number;
  events: PlannerEvent[];
  draggingState: DragInteractionState | null;
  selection: SelectionState | null;
  onOpenEvent: (event: PlannerEvent) => void;
  onStartSelection: (date: string) => void;
  onHoverDate: (date: string) => void;
  onCommitSelection: () => void;
  onStartInteraction: (interaction: DragInteractionState) => void;
  onCommitInteraction: () => void;
  getPreviewDraft?: (eventId: string) => PlannerEventDraft | null;
  onVisibleMonthChange?: (monthIndex: number) => void;
}

export function MonthView(props: MonthViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const monthRefs = useRef<Array<HTMLDivElement | null>>([]);
  const visibleMonthIndexRef = useRef<number>(-1);
  const months = useMemo(() => listMonths(), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateVisibleMonth = () => {
      const containerTop = container.getBoundingClientRect().top;
      let nextMonthIndex = visibleMonthIndexRef.current;
      let smallestDistance = Number.POSITIVE_INFINITY;

      monthRefs.current.forEach((element, index) => {
        if (!element) {
          return;
        }
        const distance = Math.abs(element.getBoundingClientRect().top - containerTop);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          nextMonthIndex = index;
        }
      });

      if (nextMonthIndex !== visibleMonthIndexRef.current) {
        visibleMonthIndexRef.current = nextMonthIndex;
        props.onVisibleMonthChange?.(nextMonthIndex);
      }
    };

    updateVisibleMonth();
    container.addEventListener('scroll', updateVisibleMonth, { passive: true });
    return () => container.removeEventListener('scroll', updateVisibleMonth);
  }, [props.onVisibleMonthChange]);

  useEffect(() => {
    if (visibleMonthIndexRef.current === props.monthIndex) {
      return;
    }

    const target = monthRefs.current[props.monthIndex];
    if (!target) {
      return;
    }

    visibleMonthIndexRef.current = props.monthIndex;
    target.scrollIntoView({ block: 'start', behavior: visibleMonthIndexRef.current === -1 ? 'auto' : 'smooth' });
  }, [props.monthIndex, props.year]);

  return (
    <div ref={containerRef} className="month-scroll-view">
      {months.map((monthIndex) => (
        <div
          key={`${props.year}-${monthIndex}`}
          ref={(element) => {
            monthRefs.current[monthIndex] = element;
          }}
          className="month-scroll-item"
        >
          <MonthGrid
            year={props.year}
            monthIndex={monthIndex}
            events={props.events}
            variant="flat"
            interactive
            draggingState={props.draggingState}
            selection={props.selection}
            onOpenEvent={props.onOpenEvent}
            onStartSelection={props.onStartSelection}
            onHoverDate={props.onHoverDate}
            onCommitSelection={props.onCommitSelection}
            onStartInteraction={props.onStartInteraction}
            onCommitInteraction={props.onCommitInteraction}
            getPreviewDraft={props.getPreviewDraft}
          />
        </div>
      ))}
    </div>
  );
}
