import { useEffect, useMemo, useState } from 'react';
import { CalendarPicker } from './components/CalendarPicker';
import { EventModal } from './components/EventModal';
import { MonthView } from './components/MonthView';
import { PlannerToolbar } from './components/PlannerToolbar';
import { YearView } from './components/YearView';
import {
  addDays,
  compareIsoDate,
  differenceInDays,
  formatIsoDate,
  getMonthIndex,
  getYear,
} from './lib/date';
import {
  adoptPlannerEvent,
  createPlannerEvent,
  EVENT_TYPE_OPTIONS,
  fetchCalendarList,
  fetchPlannerEvents,
  requestGoogleAccessToken,
  updatePlannerEvent,
} from './lib/google';
import {
  readAuthHint,
  readCalendarFilters,
  readMonth,
  readSelectedCalendarIds,
  readTypeFilters,
  readView,
  writeAuthHint,
  writeCalendarFilters,
  writeMonth,
  writeSelectedCalendarIds,
  writeTypeFilters,
  writeView,
} from './lib/storage';
import type { CalendarView, GoogleCalendarEntry, PlannerEvent, PlannerEventDraft, PlannerEventType } from './types';

type ModalState =
  | { mode: 'create'; draft: PlannerEventDraft }
  | { mode: 'edit'; event: PlannerEvent; draft: PlannerEventDraft };

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

function getDefaultDraft(calendarId: string, startDate: string, endDate: string): PlannerEventDraft {
  const vacation = EVENT_TYPE_OPTIONS.find((option) => option.value === 'vacation')!;
  return {
    calendarId,
    title: '',
    startDate,
    endDate,
    colorId: vacation.defaultColorId,
    location: '',
    notes: '',
    type: vacation.value,
  };
}

function createDraftFromEvent(event: PlannerEvent): PlannerEventDraft {
  return {
    id: event.id,
    calendarId: event.calendarId,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    colorId: event.colorId,
    location: event.location,
    notes: event.notes,
    type: event.type,
  };
}

export default function App() {
  const now = new Date();
  const initialMonth = readMonth() ?? formatIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const initialYear = getYear(initialMonth);
  const initialMonthIndex = getMonthIndex(initialMonth);
  const initialView = readView() ?? 'year';

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authAttempted, setAuthAttempted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarEntry[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(readSelectedCalendarIds());
  const [calendarFilters, setCalendarFilters] = useState<string[]>(readCalendarFilters());
  const [typeFilters, setTypeFilters] = useState<PlannerEventType[]>(readTypeFilters());
  const [view, setView] = useState<CalendarView>(initialView);
  const [year, setYear] = useState(initialYear);
  const [monthIndex, setMonthIndex] = useState(initialMonthIndex);
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [draggingState, setDraggingState] = useState<DragInteractionState | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const selectedCalendars = useMemo(
    () => calendars.filter((calendar) => selectedCalendarIds.includes(calendar.id)),
    [calendars, selectedCalendarIds],
  );

  const filteredEvents = useMemo(() => {
    const activeCalendarIds = calendarFilters.length > 0 ? calendarFilters : selectedCalendarIds;
    const activeTypes = typeFilters.length > 0 ? typeFilters : EVENT_TYPE_OPTIONS.map((option) => option.value);

    return events.filter(
      (event) => activeCalendarIds.includes(event.calendarId) && activeTypes.includes(event.type),
    );
  }, [calendarFilters, events, selectedCalendarIds, typeFilters]);

  const previewDrafts = useMemo(() => {
    if (!draggingState) {
      return new Map<string, PlannerEventDraft>();
    }

    const sourceEvent = events.find((event) => event.id === draggingState.eventId);
    if (!sourceEvent) {
      return new Map<string, PlannerEventDraft>();
    }

    const nextDraft = createDraftFromEvent(sourceEvent);
    if (draggingState.kind === 'move') {
      const delta = differenceInDays(draggingState.anchorDate, draggingState.hoverDate);
      nextDraft.startDate = addDays(draggingState.baseStartDate, delta);
      nextDraft.endDate = addDays(draggingState.baseEndDate, delta);
    }
    if (draggingState.kind === 'resize-start') {
      nextDraft.startDate = compareIsoDate(draggingState.hoverDate, draggingState.baseEndDate) <= 0
        ? draggingState.hoverDate
        : draggingState.baseEndDate;
    }
    if (draggingState.kind === 'resize-end') {
      nextDraft.endDate = compareIsoDate(draggingState.hoverDate, draggingState.baseStartDate) >= 0
        ? draggingState.hoverDate
        : draggingState.baseStartDate;
    }

    return new Map([[sourceEvent.id, nextDraft]]);
  }, [draggingState, events]);

  function getPreviewDraft(eventId: string): PlannerEventDraft | null {
    return previewDrafts.get(eventId) ?? null;
  }

  async function fetchEventsForCurrentYear(token: string, activeCalendars: GoogleCalendarEntry[]) {
    if (activeCalendars.length === 0) {
      setEvents([]);
      return;
    }

    setLoadingEvents(true);
    const rangeStart = `${year}-01-01`;
    const rangeEnd = `${year}-12-31`;
    const startDate = addDays(rangeStart, -31);
    const endDate = addDays(rangeEnd, 31);
    try {
      const nextEvents = await fetchPlannerEvents(token, activeCalendars, startDate, endDate);
      setEvents(nextEvents);
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadCalendars(token: string) {
    setLoadingCalendars(true);
    setAppError(null);

    try {
      const nextCalendars = await fetchCalendarList(token);
      setCalendars(nextCalendars);

      const storedSelection = readSelectedCalendarIds();
      const validSelection = storedSelection.filter((calendarId) => nextCalendars.some((calendar) => calendar.id === calendarId));
      setSelectedCalendarIds(validSelection);
      writeSelectedCalendarIds(validSelection);
      setShowCalendarPicker(validSelection.length === 0);

      const storedCalendarFilters = readCalendarFilters().filter((calendarId) => validSelection.includes(calendarId));
      setCalendarFilters(storedCalendarFilters);
      writeCalendarFilters(storedCalendarFilters);

      const storedTypeFilters = readTypeFilters();
      setTypeFilters(storedTypeFilters.length > 0 ? storedTypeFilters : EVENT_TYPE_OPTIONS.map((option) => option.value));
      writeTypeFilters(storedTypeFilters.length > 0 ? storedTypeFilters : EVENT_TYPE_OPTIONS.map((option) => option.value));
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Could not load your Google calendars.');
    } finally {
      setLoadingCalendars(false);
    }
  }

  async function signIn(prompt: '' | 'consent') {
    setAuthError(null);
    setAppError(null);

    try {
      const token = await requestGoogleAccessToken(prompt);
      setAccessToken(token);
      writeAuthHint(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in failed.');
      if (prompt === '') {
        writeAuthHint(false);
      }
    } finally {
      setAuthAttempted(true);
    }
  }

  useEffect(() => {
    if (readAuthHint()) {
      void signIn('');
      return;
    }
    setAuthAttempted(true);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void loadCalendars(accessToken);
  }, [accessToken]);

  useEffect(() => {
    writeView(view);
  }, [view]);

  useEffect(() => {
    writeMonth(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  }, [monthIndex, year]);

  useEffect(() => {
    writeSelectedCalendarIds(selectedCalendarIds);
  }, [selectedCalendarIds]);

  useEffect(() => {
    if (selectedCalendarIds.length === 0) {
      setCalendarFilters([]);
      setEvents([]);
      return;
    }

    setCalendarFilters((current) => {
      const filtered = current.filter((calendarId) => selectedCalendarIds.includes(calendarId));
      return filtered.length > 0 ? filtered : selectedCalendarIds;
    });
  }, [selectedCalendarIds]);

  useEffect(() => {
    writeCalendarFilters(calendarFilters);
  }, [calendarFilters]);

  useEffect(() => {
    writeTypeFilters(typeFilters);
  }, [typeFilters]);

  useEffect(() => {
    if (!accessToken || selectedCalendars.length === 0) {
      return;
    }

    void fetchEventsForCurrentYear(accessToken, selectedCalendars).catch((error: unknown) => {
      setAppError(error instanceof Error ? error.message : 'Could not load planner events.');
      setLoadingEvents(false);
    });
  }, [accessToken, selectedCalendars, year]);

  function handleToggleCalendar(calendarId: string) {
    setSelectedCalendarIds((current) =>
      current.includes(calendarId)
        ? current.filter((id) => id !== calendarId)
        : [...current, calendarId],
    );
  }

  function handleToggleCalendarFilter(calendarId: string) {
    setCalendarFilters((current) =>
      current.includes(calendarId) ? current.filter((id) => id !== calendarId) : [...current, calendarId],
    );
  }

  function handleToggleTypeFilter(type: PlannerEventType) {
    setTypeFilters((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
    );
  }

  function handleOpenEvent(event: PlannerEvent) {
    setModalState({
      mode: 'edit',
      event,
      draft: createDraftFromEvent(event),
    });
  }

  function handleStartSelection(date: string) {
    if (view !== 'month' || selectedCalendarIds.length === 0) {
      return;
    }
    setSelection({ startDate: date, endDate: date });
  }

  function handleHoverDate(date: string) {
    if (selection) {
      setSelection((current) => (current ? { ...current, endDate: date } : current));
    }
    if (draggingState) {
      setDraggingState((current) => (current ? { ...current, hoverDate: date } : current));
    }
  }

  function handleCommitSelection() {
    if (!selection || selectedCalendarIds.length === 0) {
      setSelection(null);
      return;
    }

    const startDate = compareIsoDate(selection.startDate, selection.endDate) <= 0 ? selection.startDate : selection.endDate;
    const endDate = compareIsoDate(selection.startDate, selection.endDate) <= 0 ? selection.endDate : selection.startDate;

    setModalState({
      mode: 'create',
      draft: getDefaultDraft(selectedCalendarIds[0], startDate, endDate),
    });
    setSelection(null);
  }

  function handleStartInteraction(interaction: DragInteractionState) {
    setDraggingState(interaction);
  }

  async function handleCommitInteraction() {
    if (!draggingState || !accessToken) {
      setDraggingState(null);
      return;
    }

    const draft = previewDrafts.get(draggingState.eventId);
    setDraggingState(null);

    if (!draft || !draft.id) {
      return;
    }

    setSavingEvent(true);
    setAppError(null);

    try {
      const updated = await updatePlannerEvent(accessToken, draft, calendars);
      setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)));
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Could not update the event.');
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleSaveDraft(draft: PlannerEventDraft) {
    if (!accessToken) {
      return;
    }

    setSavingEvent(true);
    setAppError(null);

    try {
      if (modalState?.mode === 'create') {
        const created = await createPlannerEvent(accessToken, draft, calendars);
        setEvents((current) => [...current, created]);
      } else {
        const updated = await updatePlannerEvent(accessToken, draft, calendars);
        setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)));
      }
      setModalState(null);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Could not save the event.');
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleAdoptEvent(event: PlannerEvent) {
    if (!accessToken) {
      return;
    }

    setSavingEvent(true);
    setAppError(null);

    try {
      const adopted = await adoptPlannerEvent(accessToken, event, calendars);
      setEvents((current) => current.map((item) => (item.id === adopted.id ? adopted : item)));
      setModalState({
        mode: 'edit',
        event: adopted,
        draft: createDraftFromEvent(adopted),
      });
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Could not adopt the event.');
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleRefresh() {
    if (!accessToken) {
      return;
    }

    setAppError(null);
    void fetchEventsForCurrentYear(accessToken, selectedCalendars).catch((error: unknown) => {
      setAppError(error instanceof Error ? error.message : 'Could not refresh planner events.');
      setLoadingEvents(false);
    });
  }

  const emptySelection = selectedCalendarIds.length === 0;

  return (
    <div className="app-shell">
      <div className="app-background" />
      <main className="app-content">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">Long-range planning</p>
            <h1>See a whole year of multi-day plans without leaving the browser.</h1>
            <p className="muted">
              YearPlan layers vacations, travel, hotel stays, flights, and holidays directly on top of Google Calendar data.
              It is built for year-scale planning, not day-by-day scheduling.
            </p>
          </div>

          {!accessToken ? (
            <div className="auth-card">
              <h2>Connect Google Calendar</h2>
              <p className="muted">
                Sign in with Google to load calendars, filter event types, and create or update YearPlan-managed planning items.
              </p>
              <button type="button" className="button button-primary" onClick={() => void signIn('consent')}>
                Sign in with Google
              </button>
              {authAttempted && authError ? <p className="error-text">{authError}</p> : null}
            </div>
          ) : (
            <div className="status-card">
              <strong>Connected to Google Calendar</strong>
              <span>Browser-only OAuth. Events stay in your selected calendars.</span>
            </div>
          )}
        </section>

        {appError ? <div className="panel error-banner">{appError}</div> : null}

        {accessToken && calendars.length > 0 && (showCalendarPicker || emptySelection) ? (
          <CalendarPicker
            calendars={calendars}
            selectedCalendarIds={selectedCalendarIds}
            onToggleCalendar={handleToggleCalendar}
            onContinue={() => setShowCalendarPicker(false)}
          />
        ) : null}

        {accessToken && calendars.length > 0 && !emptySelection && !showCalendarPicker ? (
          <>
            <PlannerToolbar
              calendars={calendars}
              calendarFilters={calendarFilters}
              monthIndex={monthIndex}
              selectedCalendarIds={selectedCalendarIds}
              typeFilters={typeFilters}
              view={view}
              year={year}
              onSetView={setView}
              onSetMonth={setMonthIndex}
              onShiftYear={(delta) => setYear((current) => current + delta)}
              onToggleCalendarFilter={handleToggleCalendarFilter}
              onToggleTypeFilter={handleToggleTypeFilter}
              onRefresh={() => void handleRefresh()}
              onManageCalendars={() => setShowCalendarPicker(true)}
              loading={loadingEvents || loadingCalendars}
            />

            {view === 'year' ? (
              <YearView year={year} events={filteredEvents} onOpenEvent={handleOpenEvent} getPreviewDraft={getPreviewDraft} />
            ) : (
              <MonthView
                year={year}
                monthIndex={monthIndex}
                events={filteredEvents}
                draggingState={draggingState}
                selection={selection}
                onOpenEvent={handleOpenEvent}
                onStartSelection={handleStartSelection}
                onHoverDate={handleHoverDate}
                onCommitSelection={handleCommitSelection}
                onStartInteraction={handleStartInteraction}
                onCommitInteraction={() => void handleCommitInteraction()}
                getPreviewDraft={getPreviewDraft}
              />
            )}
          </>
        ) : null}

        {accessToken && calendars.length === 0 && loadingCalendars ? (
          <div className="panel centered-state">Loading calendars…</div>
        ) : null}

        {accessToken && calendars.length === 0 && !loadingCalendars ? (
          <div className="panel centered-state">
            No writable Google Calendars were found for this account.
          </div>
        ) : null}
      </main>

      <EventModal
        calendars={selectedCalendars.length > 0 ? selectedCalendars : calendars}
        mode={modalState?.mode ?? 'create'}
        event={modalState?.mode === 'edit' ? modalState.event : null}
        draft={modalState?.draft ?? null}
        saving={savingEvent}
        onClose={() => setModalState(null)}
        onSave={(draft) => void handleSaveDraft(draft)}
        onAdopt={(event) => void handleAdoptEvent(event)}
      />
    </div>
  );
}
