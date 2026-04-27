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
}

export function MonthView(props: MonthViewProps) {
  return (
    <MonthGrid
      year={props.year}
      monthIndex={props.monthIndex}
      events={props.events}
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
  );
}
