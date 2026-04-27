import { compareIsoDate, endOfMonth, endOfWeekMonday, getDayOfWeekMonday, maxIsoDate, minIsoDate, startOfMonth, startOfWeekMonday } from './date';
import type { EventSegment, MonthLayout, MonthWeek, PlannerEvent } from '../types';

function buildMonthWeeks(year: number, monthIndex: number): MonthWeek[] {
  const first = startOfMonth(year, monthIndex);
  const last = endOfMonth(year, monthIndex);
  const gridStart = startOfWeekMonday(first);
  const gridEnd = endOfWeekMonday(last);

  const weeks: MonthWeek[] = [];
  let cursor = gridStart;

  while (compareIsoDate(cursor, gridEnd) <= 0) {
    weeks.push({
      start: cursor,
      end: endOfWeekMonday(cursor),
      days: Array.from({ length: 7 }, (_, index) => {
        const day = new Date(`${cursor}T00:00:00Z`);
        day.setUTCDate(day.getUTCDate() + index);
        return day.toISOString().slice(0, 10);
      }),
    });
    const next = new Date(`${cursor}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 7);
    cursor = next.toISOString().slice(0, 10);
  }

  return weeks;
}

export function buildMonthLayout(year: number, monthIndex: number, events: PlannerEvent[]): MonthLayout {
  const weeks = buildMonthWeeks(year, monthIndex);
  const segmentsByWeek: EventSegment[][] = weeks.map(() => []);
  const laneCounts = weeks.map(() => 0);

  const sortedEvents = [...events].sort((left, right) => {
    const startComparison = compareIsoDate(left.startDate, right.startDate);
    if (startComparison !== 0) {
      return startComparison;
    }
    return compareIsoDate(right.endDate, left.endDate);
  });

  weeks.forEach((week, weekIndex) => {
    const occupiedUntil: string[] = [];

    sortedEvents.forEach((event) => {
      if (compareIsoDate(event.endDate, week.start) < 0 || compareIsoDate(event.startDate, week.end) > 0) {
        return;
      }

      const segmentStart = maxIsoDate(event.startDate, week.start);
      const segmentEnd = minIsoDate(event.endDate, week.end);

      let lane = 0;
      while (occupiedUntil[lane] && compareIsoDate(occupiedUntil[lane], segmentStart) >= 0) {
        lane += 1;
      }
      occupiedUntil[lane] = segmentEnd;

      const segment: EventSegment = {
        key: `${event.id}:${weekIndex}:${lane}`,
        eventId: event.id,
        weekIndex,
        lane,
        startColumn: getDayOfWeekMonday(segmentStart),
        endColumn: getDayOfWeekMonday(segmentEnd),
        startDate: segmentStart,
        endDate: segmentEnd,
        continuesBefore: compareIsoDate(event.startDate, week.start) < 0,
        continuesAfter: compareIsoDate(event.endDate, week.end) > 0,
      };

      segmentsByWeek[weekIndex].push(segment);
      laneCounts[weekIndex] = Math.max(laneCounts[weekIndex], lane + 1);
    });
  });

  return { weeks, segmentsByWeek, laneCounts };
}
