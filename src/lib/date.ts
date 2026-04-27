const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDateParts(value: string): [number, number, number] {
  const [year, month, day] = value.split('-').map(Number);
  return [year, month, day];
}

export function isoDateFromParts(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = parseIsoDateParts(value);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, amount: number): string {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatIsoDate(date);
}

export function differenceInDays(start: string, end: string): number {
  return Math.round((parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / DAY_MS);
}

export function compareIsoDate(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function minIsoDate(left: string, right: string): string {
  return compareIsoDate(left, right) <= 0 ? left : right;
}

export function maxIsoDate(left: string, right: string): string {
  return compareIsoDate(left, right) >= 0 ? left : right;
}

export function startOfMonth(year: number, monthIndex: number): string {
  return isoDateFromParts(year, monthIndex, 1);
}

export function endOfMonth(year: number, monthIndex: number): string {
  return formatIsoDate(new Date(Date.UTC(year, monthIndex + 1, 0)));
}

export function getMonthLabel(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

export function getMonthShortLabel(monthIndex: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2026, monthIndex, 1)));
}

export function getWeekdayShortLabels(): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat('en-US', {
      weekday: 'narrow',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2026, 3, 27 + index))),
  );
}

export function getDayOfWeekMonday(value: string): number {
  const day = parseIsoDate(value).getUTCDay();
  return day === 0 ? 6 : day - 1;
}

export function startOfWeekMonday(value: string): string {
  return addDays(value, -getDayOfWeekMonday(value));
}

export function endOfWeekMonday(value: string): string {
  return addDays(startOfWeekMonday(value), 6);
}

export function isSameMonth(value: string, year: number, monthIndex: number): boolean {
  const [itemYear, itemMonth] = parseIsoDateParts(value);
  return itemYear === year && itemMonth === monthIndex + 1;
}

export function getYear(value: string): number {
  return parseIsoDate(value).getUTCFullYear();
}

export function getMonthIndex(value: string): number {
  return parseIsoDate(value).getUTCMonth();
}

export function clampDateToRange(value: string, start: string, end: string): string {
  return minIsoDate(maxIsoDate(value, start), end);
}

export function listMonths(): number[] {
  return Array.from({ length: 12 }, (_, index) => index);
}
