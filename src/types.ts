export type CalendarView = 'year' | 'month';
export type AppMode = 'google' | 'demo';

export type PlannerEventType =
  | 'vacation'
  | 'holiday'
  | 'travel'
  | 'hotel'
  | 'flight';

export interface GoogleCalendarEntry {
  id: string;
  summary: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
}

export interface PlannerEvent {
  id: string;
  calendarId: string;
  calendarSummary: string;
  title: string;
  startDate: string;
  endDate: string;
  colorId: string;
  location: string;
  notes: string;
  type: PlannerEventType;
  managedByYearPlan: boolean;
  readOnly: boolean;
}

export interface PlannerEventDraft {
  id?: string;
  calendarId: string;
  title: string;
  startDate: string;
  endDate: string;
  colorId: string;
  location: string;
  notes: string;
  type: PlannerEventType;
}

export interface EventSegment {
  key: string;
  eventId: string;
  weekIndex: number;
  lane: number;
  startColumn: number;
  endColumn: number;
  startDate: string;
  endDate: string;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export interface MonthWeek {
  start: string;
  end: string;
  days: string[];
}

export interface MonthLayout {
  weeks: MonthWeek[];
  segmentsByWeek: EventSegment[][];
  laneCounts: number[];
}
