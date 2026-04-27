import type { CalendarView, PlannerEventType } from '../types';

const STORAGE_KEYS = {
  selectedCalendarIds: 'yearplan:selected-calendar-ids',
  calendarFilters: 'yearplan:calendar-filters',
  typeFilters: 'yearplan:type-filters',
  view: 'yearplan:view',
  month: 'yearplan:month',
  authHint: 'yearplan:auth-hint',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readSelectedCalendarIds(): string[] {
  return readJson<string[]>(STORAGE_KEYS.selectedCalendarIds, []);
}

export function writeSelectedCalendarIds(ids: string[]): void {
  writeJson(STORAGE_KEYS.selectedCalendarIds, ids);
}

export function readCalendarFilters(): string[] {
  return readJson<string[]>(STORAGE_KEYS.calendarFilters, []);
}

export function writeCalendarFilters(ids: string[]): void {
  writeJson(STORAGE_KEYS.calendarFilters, ids);
}

export function readTypeFilters(): PlannerEventType[] {
  return readJson<PlannerEventType[]>(STORAGE_KEYS.typeFilters, []);
}

export function writeTypeFilters(types: PlannerEventType[]): void {
  writeJson(STORAGE_KEYS.typeFilters, types);
}

export function readView(): CalendarView | null {
  return readJson<CalendarView | null>(STORAGE_KEYS.view, null);
}

export function writeView(view: CalendarView): void {
  writeJson(STORAGE_KEYS.view, view);
}

export function readMonth(): string | null {
  return readJson<string | null>(STORAGE_KEYS.month, null);
}

export function writeMonth(month: string): void {
  writeJson(STORAGE_KEYS.month, month);
}

export function readAuthHint(): boolean {
  return readJson<boolean>(STORAGE_KEYS.authHint, false);
}

export function writeAuthHint(value: boolean): void {
  writeJson(STORAGE_KEYS.authHint, value);
}
