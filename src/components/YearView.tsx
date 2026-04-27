import { listMonths } from '../lib/date';
import type { PlannerEvent, PlannerEventDraft } from '../types';
import { MonthGrid } from './MonthGrid';

interface YearViewProps {
  year: number;
  events: PlannerEvent[];
  onOpenEvent: (event: PlannerEvent) => void;
  getPreviewDraft?: (eventId: string) => PlannerEventDraft | null;
}

export function YearView({ year, events, onOpenEvent, getPreviewDraft }: YearViewProps) {
  return (
    <section className="year-grid">
      {listMonths().map((monthIndex) => (
        <MonthGrid
          key={`${year}-${monthIndex}`}
          compact
          year={year}
          monthIndex={monthIndex}
          events={events}
          draggingState={null}
          selection={null}
          onOpenEvent={onOpenEvent}
          getPreviewDraft={getPreviewDraft}
        />
      ))}
    </section>
  );
}
