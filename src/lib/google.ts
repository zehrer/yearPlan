import { addDays, compareIsoDate } from './date';
import type {
  GoogleCalendarEntry,
  PlannerEvent,
  PlannerEventDraft,
  PlannerEventType,
} from '../types';

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar';
const GOOGLE_API_ROOT = 'https://www.googleapis.com/calendar/v3';
const AUTH_SCRIPT = 'https://accounts.google.com/gsi/client';

const TYPE_FALLBACK: PlannerEventType = 'travel';

export const EVENT_TYPE_OPTIONS: Array<{ value: PlannerEventType; label: string; defaultColorId: string }> = [
  { value: 'vacation', label: 'Vacation', defaultColorId: '2' },
  { value: 'holiday', label: 'Holiday', defaultColorId: '5' },
  { value: 'travel', label: 'Travel', defaultColorId: '10' },
  { value: 'hotel', label: 'Hotel Stay', defaultColorId: '6' },
  { value: 'flight', label: 'Flight', defaultColorId: '11' },
];

export const GOOGLE_EVENT_COLORS: Record<string, { background: string; foreground: string; label: string }> = {
  '1': { background: '#a4bdfc', foreground: '#1d1d1d', label: 'Lavender' },
  '2': { background: '#7ae7bf', foreground: '#1d1d1d', label: 'Sage' },
  '3': { background: '#dbadff', foreground: '#1d1d1d', label: 'Grape' },
  '4': { background: '#ff887c', foreground: '#1d1d1d', label: 'Flamingo' },
  '5': { background: '#fbd75b', foreground: '#1d1d1d', label: 'Banana' },
  '6': { background: '#ffb878', foreground: '#1d1d1d', label: 'Tangerine' },
  '7': { background: '#46d6db', foreground: '#1d1d1d', label: 'Peacock' },
  '8': { background: '#e1e1e1', foreground: '#1d1d1d', label: 'Graphite' },
  '9': { background: '#5484ed', foreground: '#ffffff', label: 'Blueberry' },
  '10': { background: '#51b749', foreground: '#ffffff', label: 'Basil' },
  '11': { background: '#dc2127', foreground: '#ffffff', label: 'Tomato' },
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }): {
            requestAccessToken(options?: { prompt?: string }): void;
          };
        };
      };
    };
  }
}

function getClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID. Add it to your environment before signing in.');
  }
  return clientId;
}

export function hasGoogleClientIdConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}

function getEventTypeLabel(type: PlannerEventType): string {
  return EVENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Travel';
}

function getDefaultColorForType(type: PlannerEventType): string {
  return EVENT_TYPE_OPTIONS.find((option) => option.value === type)?.defaultColorId ?? '10';
}

function getEventTypeFromMetadata(rawType?: string | null): PlannerEventType {
  const match = EVENT_TYPE_OPTIONS.find((option) => option.value === rawType);
  return match?.value ?? TYPE_FALLBACK;
}

function appendQuery(url: string, query: Record<string, string | undefined>): string {
  const next = new URL(url);
  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      next.searchParams.set(key, value);
    }
  });
  return next.toString();
}

async function fetchGoogle<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Google request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${AUTH_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = AUTH_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });
}

export async function requestGoogleAccessToken(prompt: '' | 'consent'): Promise<string> {
  await loadGoogleIdentityScript();
  const clientId = getClientId();

  return await new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? 'Google sign-in did not return an access token.'));
          return;
        }
        resolve(response.access_token);
      },
    });

    if (!tokenClient) {
      reject(new Error('Google Identity Services did not initialize correctly.'));
      return;
    }

    tokenClient.requestAccessToken({ prompt });
  });
}

export async function fetchCalendarList(accessToken: string): Promise<GoogleCalendarEntry[]> {
  const data = await fetchGoogle<{ items?: Array<Record<string, unknown>> }>(
    appendQuery(`${GOOGLE_API_ROOT}/users/me/calendarList`, {
      minAccessRole: 'writer',
      showDeleted: 'false',
      showHidden: 'false',
    }),
    accessToken,
  );

  return (data.items ?? []).map((item) => ({
    id: String(item.id ?? ''),
    summary: String(item.summary ?? 'Untitled'),
    backgroundColor: typeof item.backgroundColor === 'string' ? item.backgroundColor : undefined,
    foregroundColor: typeof item.foregroundColor === 'string' ? item.foregroundColor : undefined,
    primary: Boolean(item.primary),
  }));
}

function mapGoogleEventToPlannerEvent(raw: Record<string, any>, calendar: GoogleCalendarEntry): PlannerEvent | null {
  const startDate = raw.start?.date;
  const endExclusive = raw.end?.date;
  if (typeof startDate !== 'string' || typeof endExclusive !== 'string') {
    return null;
  }

  const endDate = addDays(endExclusive, -1);
  if (compareIsoDate(startDate, endDate) > 0) {
    return null;
  }

  const privateProperties = raw.extendedProperties?.private ?? {};
  const type = getEventTypeFromMetadata(privateProperties.yearPlanType);

  return {
    id: String(raw.id),
    calendarId: calendar.id,
    calendarSummary: calendar.summary,
    title: String(raw.summary ?? 'Untitled'),
    startDate,
    endDate,
    colorId: String(raw.colorId ?? getDefaultColorForType(type)),
    location: typeof raw.location === 'string' ? raw.location : '',
    notes: typeof raw.description === 'string' ? raw.description : '',
    type,
    managedByYearPlan: privateProperties.yearPlanManaged === 'true',
    readOnly: privateProperties.yearPlanManaged !== 'true',
  };
}

export async function fetchPlannerEvents(
  accessToken: string,
  calendars: GoogleCalendarEntry[],
  startDate: string,
  endDate: string,
): Promise<PlannerEvent[]> {
  const responses = await Promise.all(
    calendars.map(async (calendar) => {
      const data = await fetchGoogle<{ items?: Array<Record<string, any>> }>(
        appendQuery(`${GOOGLE_API_ROOT}/calendars/${encodeURIComponent(calendar.id)}/events`, {
          singleEvents: 'false',
          showDeleted: 'false',
          timeMin: `${startDate}T00:00:00Z`,
          timeMax: `${addDays(endDate, 1)}T00:00:00Z`,
          maxResults: '2500',
        }),
        accessToken,
      );

      return (data.items ?? [])
        .map((item) => mapGoogleEventToPlannerEvent(item, calendar))
        .filter((item): item is PlannerEvent => item !== null);
    }),
  );

  return responses.flat().sort((left, right) => {
    const startComparison = compareIsoDate(left.startDate, right.startDate);
    if (startComparison !== 0) {
      return startComparison;
    }
    const endComparison = compareIsoDate(right.endDate, left.endDate);
    if (endComparison !== 0) {
      return endComparison;
    }
    return left.title.localeCompare(right.title);
  });
}

function buildEventPayload(draft: PlannerEventDraft): Record<string, unknown> {
  const typeLabel = getEventTypeLabel(draft.type);

  return {
    summary: draft.title,
    description: draft.notes,
    location: draft.location,
    colorId: draft.colorId,
    start: { date: draft.startDate },
    end: { date: addDays(draft.endDate, 1) },
    extendedProperties: {
      private: {
        yearPlanManaged: 'true',
        yearPlanType: draft.type,
        yearPlanTypeLabel: typeLabel,
      },
    },
  };
}

export async function createPlannerEvent(
  accessToken: string,
  draft: PlannerEventDraft,
  calendars: GoogleCalendarEntry[],
): Promise<PlannerEvent> {
  const response = await fetchGoogle<Record<string, any>>(
    `${GOOGLE_API_ROOT}/calendars/${encodeURIComponent(draft.calendarId)}/events`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(buildEventPayload(draft)),
    },
  );

  const calendar = calendars.find((entry) => entry.id === draft.calendarId);
  if (!calendar) {
    throw new Error('Calendar not found after event creation.');
  }

  const mapped = mapGoogleEventToPlannerEvent(response, calendar);
  if (!mapped) {
    throw new Error('Created event could not be mapped into a planner event.');
  }

  return mapped;
}

export async function updatePlannerEvent(
  accessToken: string,
  draft: PlannerEventDraft,
  calendars: GoogleCalendarEntry[],
): Promise<PlannerEvent> {
  if (!draft.id) {
    throw new Error('Cannot update an event without an id.');
  }

  const response = await fetchGoogle<Record<string, any>>(
    `${GOOGLE_API_ROOT}/calendars/${encodeURIComponent(draft.calendarId)}/events/${encodeURIComponent(draft.id)}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(buildEventPayload(draft)),
    },
  );

  const calendar = calendars.find((entry) => entry.id === draft.calendarId);
  if (!calendar) {
    throw new Error('Calendar not found after event update.');
  }

  const mapped = mapGoogleEventToPlannerEvent(response, calendar);
  if (!mapped) {
    throw new Error('Updated event could not be mapped into a planner event.');
  }

  return mapped;
}

export async function adoptPlannerEvent(
  accessToken: string,
  event: PlannerEvent,
  calendars: GoogleCalendarEntry[],
): Promise<PlannerEvent> {
  const draft: PlannerEventDraft = {
    id: event.id,
    calendarId: event.calendarId,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    colorId: event.colorId || getDefaultColorForType(event.type),
    location: event.location,
    notes: event.notes,
    type: event.type ?? TYPE_FALLBACK,
  };

  return await updatePlannerEvent(accessToken, draft, calendars);
}
