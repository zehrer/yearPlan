import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarPicker } from './components/CalendarPicker';
import { EventModal } from './components/EventModal';
import { MonthView } from './components/MonthView';
import { PlannerFiltersSidebar } from './components/PlannerFiltersSidebar';
import { StatusConsole } from './components/StatusConsole';
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
  getConfiguredGoogleClientId,
  hasGoogleClientIdConfigured,
  requestGoogleAccessToken,
  updatePlannerEvent,
} from './lib/google';
import { DEMO_CALENDARS, DEMO_EVENTS } from './lib/demo';
import {
  readAppMode,
  readAuthHint,
  readCalendarFilters,
  readDemoFallback,
  readDemoEvents,
  readMonth,
  readSelectedCalendarIds,
  readTypeFilters,
  readView,
  writeAppMode,
  writeAuthHint,
  writeCalendarFilters,
  writeDemoFallback,
  writeDemoEvents,
  writeMonth,
  writeSelectedCalendarIds,
  writeTypeFilters,
  writeView,
} from './lib/storage';
import type { AppMode, CalendarView, GoogleCalendarEntry, PlannerEvent, PlannerEventDraft, PlannerEventType } from './types';

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

interface AppLogEntry {
  id: number;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  timestamp: string;
}

function isLikelyEmail(value: string): boolean {
  return value.includes('@');
}

function toDisplayName(value: string): string {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getCalendarDisplayName(calendar: GoogleCalendarEntry): string {
  if (calendar.primary && isLikelyEmail(calendar.summary)) {
    return 'My calendar';
  }
  return calendar.summary;
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
  const googleConfigured = hasGoogleClientIdConfigured();
  const configuredClientId = getConfiguredGoogleClientId();
  const storedMode = readAppMode();
  const initialMode = !googleConfigured ? 'demo' : readDemoFallback() ? 'google' : (storedMode ?? 'google');
  const logIdRef = useRef(0);
  const bootLogKeysRef = useRef<Set<string>>(new Set());

  const [appMode, setAppMode] = useState<AppMode>(initialMode);
  const [accessToken, setAccessToken] = useState<string | null>(null);
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
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [logs, setLogs] = useState<AppLogEntry[]>([]);
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isDemoMode = appMode === 'demo';
  const showSignedOutPreview = !isDemoMode && !accessToken;
  const clientIdPreview = configuredClientId
    ? `${configuredClientId.slice(0, 18)}...${configuredClientId.slice(-8)}`
    : 'missing';
  const currentTitle = view === 'year'
    ? String(year)
    : new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, monthIndex, 1)));

  const selectedCalendars = useMemo(
    () => calendars.filter((calendar) => selectedCalendarIds.includes(calendar.id)),
    [calendars, selectedCalendarIds],
  );
  const primaryCalendar = useMemo(
    () => selectedCalendars.find((calendar) => calendar.primary) ?? calendars.find((calendar) => calendar.primary) ?? null,
    [calendars, selectedCalendars],
  );
  const topbarUserLabel = accessToken
    ? primaryCalendar
      ? isLikelyEmail(primaryCalendar.summary)
        ? toDisplayName(primaryCalendar.summary.split('@')[0] ?? 'Google user')
        : primaryCalendar.summary
      : 'Google user'
    : isDemoMode
      ? 'Demo user'
      : 'Guest';

  const sidebarCalendars = useMemo(
    () => (calendars.length > 0 ? calendars : DEMO_CALENDARS),
    [calendars],
  );

  const activeCalendarIds = useMemo(
    () => (selectedCalendarIds.length > 0 ? selectedCalendarIds : sidebarCalendars.map((calendar) => calendar.id)),
    [selectedCalendarIds, sidebarCalendars],
  );

  const filteredEvents = useMemo(() => {
    const activeFilterCalendarIds = calendarFilters.length > 0 ? calendarFilters : selectedCalendarIds;
    const activeTypes = typeFilters.length > 0 ? typeFilters : EVENT_TYPE_OPTIONS.map((option) => option.value);

    return events.filter(
      (event) => activeFilterCalendarIds.includes(event.calendarId) && activeTypes.includes(event.type),
    );
  }, [calendarFilters, events, selectedCalendarIds, typeFilters]);

  const signedOutPreviewEvents = useMemo(
    () => DEMO_EVENTS.filter((event) => getYear(event.startDate) <= year && getYear(event.endDate) >= year),
    [year],
  );

  const displayEvents = useMemo(() => {
    if (showSignedOutPreview) {
      const activeFilterCalendarIds = calendarFilters.length > 0 ? calendarFilters : sidebarCalendars.map((calendar) => calendar.id);
      const activeTypes = typeFilters.length > 0 ? typeFilters : EVENT_TYPE_OPTIONS.map((option) => option.value);
      return signedOutPreviewEvents.filter(
        (event) => activeFilterCalendarIds.includes(event.calendarId) && activeTypes.includes(event.type),
      );
    }

    return filteredEvents;
  }, [calendarFilters, filteredEvents, showSignedOutPreview, sidebarCalendars, signedOutPreviewEvents, typeFilters]);

  const appendLog = useCallback((level: AppLogEntry['level'], source: string, message: string) => {
    const entry: AppLogEntry = {
      id: ++logIdRef.current,
      level,
      source,
      message,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    };

    setLogs((current) => [...current.slice(-79), entry]);
    const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
    logger(`[YearPlan:${source}] ${message}`);
  }, []);

  const appendBootLogOnce = useCallback((level: AppLogEntry['level'], source: string, message: string) => {
    const key = `${source}:${message}`;
    if (bootLogKeysRef.current.has(key)) {
      return;
    }
    bootLogKeysRef.current.add(key);
    appendLog(level, source, message);
  }, [appendLog]);

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

  function handleSetAppMode(mode: AppMode) {
    setAppMode(mode);
    writeDemoFallback(false);
    appendLog('info', 'Mode', `Switched to ${mode} mode.`);
  }

  function handleNavigatePrevious() {
    if (view === 'year') {
      setYear((current) => current - 1);
      return;
    }

    setMonthIndex((current) => {
      if (current === 0) {
        setYear((yearCurrent) => yearCurrent - 1);
        return 11;
      }
      return current - 1;
    });
  }

  function handleNavigateNext() {
    if (view === 'year') {
      setYear((current) => current + 1);
      return;
    }

    setMonthIndex((current) => {
      if (current === 11) {
        setYear((yearCurrent) => yearCurrent + 1);
        return 0;
      }
      return current + 1;
    });
  }

  function handleDisconnectGoogle() {
    setAccessToken(null);
    setCalendars([]);
    setSelectedCalendarIds([]);
    setCalendarFilters([]);
    writeAuthHint(false);
    setUserMenuOpen(false);
    appendLog('info', 'Auth', 'Disconnected Google session and returned to preview mode.');
  }

  async function fetchEventsForCurrentYear(token: string, activeCalendars: GoogleCalendarEntry[]) {
    if (activeCalendars.length === 0) {
      setEvents([]);
      appendLog('warn', 'Events', 'Skipped year fetch because no calendars are selected.');
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
      appendLog('info', 'Events', `Loaded ${nextEvents.length} events for ${year}.`);
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
      appendLog('info', 'Calendars', `Loaded ${nextCalendars.length} writable calendars from Google.`);

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
      appendLog('error', 'Calendars', error instanceof Error ? error.message : 'Could not load your Google calendars.');
    } finally {
      setLoadingCalendars(false);
    }
  }

  async function signIn(prompt: '' | 'consent') {
    setAuthError(null);
    setAppError(null);
    appendLog('info', 'Auth', `Starting Google sign-in with prompt="${prompt || 'silent'}".`);

    try {
      const token = await requestGoogleAccessToken(prompt);
      setAccessToken(token);
      writeAuthHint(true);
      appendLog('info', 'Auth', 'Google access token received.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in failed.');
      appendLog('error', 'Auth', error instanceof Error ? error.message : 'Sign-in failed.');
      if (prompt === '') {
        writeAuthHint(false);
      }
    } finally {
    }
  }

  useEffect(() => {
    writeAppMode(appMode);
  }, [appMode]);

  useEffect(() => {
    appendBootLogOnce(
      googleConfigured ? 'info' : 'warn',
      'Boot',
      `Build config loaded. Google client id is ${googleConfigured ? 'present' : 'missing'} for ${window.location.origin}${window.location.pathname}.`,
    );
  }, [appendBootLogOnce, googleConfigured]);

  useEffect(() => {
    if (!googleConfigured) {
      writeDemoFallback(true);
      appendBootLogOnce('warn', 'Boot', 'Falling back to demo mode because the Google client id is missing in this build.');
    }
  }, [appendBootLogOnce, googleConfigured]);

  useEffect(() => {
    if (googleConfigured && readDemoFallback() && appMode === 'demo') {
      setAppMode('google');
      writeDemoFallback(false);
      appendBootLogOnce('info', 'Boot', 'Detected a configured Google client id and cleared a stale demo fallback state.');
    }
  }, [appMode, appendBootLogOnce, googleConfigured]);

  useEffect(() => {
    if (isDemoMode) {
      const demoEvents = readDemoEvents();
      const nextEvents = demoEvents.length > 0 ? demoEvents : DEMO_EVENTS;

      setAccessToken(null);
      setCalendars(DEMO_CALENDARS);
      setSelectedCalendarIds(DEMO_CALENDARS.map((calendar) => calendar.id));
      setCalendarFilters(DEMO_CALENDARS.map((calendar) => calendar.id));
      setTypeFilters(EVENT_TYPE_OPTIONS.map((option) => option.value));
      setShowCalendarPicker(false);
      setEvents(nextEvents);
      writeDemoEvents(nextEvents);
      setAuthError(null);
      setAppError(null);
      appendLog('info', 'Demo', `Demo mode active with ${DEMO_CALENDARS.length} calendars and ${nextEvents.length} events.`);
    }
  }, [appendLog, isDemoMode]);

  useEffect(() => {
    if (isDemoMode || !googleConfigured) {
      appendBootLogOnce('info', 'Auth', isDemoMode ? 'Skipping Google auto sign-in because demo mode is active.' : 'Skipping Google auto sign-in because the client id is missing.');
      return;
    }

    if (readAuthHint()) {
      appendBootLogOnce('info', 'Auth', 'Attempting silent Google sign-in based on stored auth hint.');
      void signIn('');
      return;
    }
    appendBootLogOnce('info', 'Auth', 'Google configured. Waiting for explicit sign-in.');
  }, [appendBootLogOnce, googleConfigured, isDemoMode]);

  useEffect(() => {
    if (isDemoMode || !accessToken) {
      return;
    }

    void loadCalendars(accessToken);
  }, [accessToken, isDemoMode]);

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
    if (isDemoMode || !accessToken || selectedCalendars.length === 0) {
      return;
    }

    void fetchEventsForCurrentYear(accessToken, selectedCalendars).catch((error: unknown) => {
      setAppError(error instanceof Error ? error.message : 'Could not load planner events.');
      appendLog('error', 'Events', error instanceof Error ? error.message : 'Could not load planner events.');
      setLoadingEvents(false);
    });
  }, [accessToken, appendLog, isDemoMode, selectedCalendars, year]);

  useEffect(() => {
    if (isDemoMode) {
      writeDemoEvents(events);
    }
  }, [events, isDemoMode]);

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
    if (!draggingState) {
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
      if (isDemoMode) {
        setEvents((current) => current.map((event) => (event.id === draft.id ? { ...event, ...draft } : event)));
        appendLog('info', 'Edit', `Updated demo event ${draft.id}.`);
      } else if (accessToken) {
        const updated = await updatePlannerEvent(accessToken, draft, calendars);
        setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)));
        appendLog('info', 'Edit', `Updated Google event ${updated.id}.`);
      }
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Could not update the event.');
      appendLog('error', 'Edit', error instanceof Error ? error.message : 'Could not update the event.');
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleSaveDraft(draft: PlannerEventDraft) {
    if (!isDemoMode && !accessToken) {
      return;
    }

    setSavingEvent(true);
    setAppError(null);

    try {
      if (modalState?.mode === 'create') {
        if (isDemoMode) {
          const calendarSummary = calendars.find((calendar) => calendar.id === draft.calendarId)?.summary ?? 'Demo Calendar';
          const created: PlannerEvent = {
            id: `demo-${crypto.randomUUID()}`,
            calendarId: draft.calendarId,
            calendarSummary,
            title: draft.title,
            startDate: draft.startDate,
            endDate: draft.endDate,
            colorId: draft.colorId,
            location: draft.location,
            notes: draft.notes,
            type: draft.type,
            managedByYearPlan: true,
            readOnly: false,
          };
          setEvents((current) => [...current, created]);
          appendLog('info', 'Create', `Created demo event "${created.title}".`);
        } else if (accessToken) {
          const created = await createPlannerEvent(accessToken, draft, calendars);
          setEvents((current) => [...current, created]);
          appendLog('info', 'Create', `Created Google event "${created.title}".`);
        }
      } else {
        if (isDemoMode) {
          const calendarSummary = calendars.find((calendar) => calendar.id === draft.calendarId)?.summary ?? 'Demo Calendar';
          setEvents((current) =>
            current.map((event) =>
              event.id === draft.id
                ? {
                    ...event,
                    ...draft,
                    calendarSummary,
                    managedByYearPlan: true,
                    readOnly: false,
                  }
                : event,
            ),
          );
          appendLog('info', 'Edit', `Saved demo event "${draft.title}".`);
        } else if (accessToken) {
          const updated = await updatePlannerEvent(accessToken, draft, calendars);
          setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)));
          appendLog('info', 'Edit', `Saved Google event "${updated.title}".`);
        }
      }
      setModalState(null);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Could not save the event.');
      appendLog('error', 'Save', error instanceof Error ? error.message : 'Could not save the event.');
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleAdoptEvent(event: PlannerEvent) {
    if (isDemoMode || !accessToken) {
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
      appendLog('info', 'Adopt', `Adopted Google event "${adopted.title}" into YearPlan metadata.`);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Could not adopt the event.');
      appendLog('error', 'Adopt', error instanceof Error ? error.message : 'Could not adopt the event.');
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleRefresh() {
    if (isDemoMode) {
      const storedDemoEvents = readDemoEvents();
      setEvents(storedDemoEvents.length > 0 ? storedDemoEvents : DEMO_EVENTS);
      appendLog('info', 'Refresh', 'Reloaded demo events from local storage.');
      return;
    }

    if (!accessToken) {
      appendLog('warn', 'Refresh', 'Refresh requested without a Google access token.');
      return;
    }

    setAppError(null);
    void fetchEventsForCurrentYear(accessToken, selectedCalendars).catch((error: unknown) => {
      setAppError(error instanceof Error ? error.message : 'Could not refresh planner events.');
      appendLog('error', 'Refresh', error instanceof Error ? error.message : 'Could not refresh planner events.');
      setLoadingEvents(false);
    });
  }

  const emptySelection = selectedCalendarIds.length === 0;
  const rightSidebarCalendars = sidebarCalendars.filter((calendar) => activeCalendarIds.includes(calendar.id));

  return (
    <div className="app-shell">
      <div className="app-background" />
      <div className="app-topbar">
        <div className="app-topbar-left">
          <button
            type="button"
            className="topbar-icon-button"
            onClick={() => setLeftRailCollapsed((current) => !current)}
            aria-label="Toggle navigation"
          >
            ≡
          </button>
          <strong>yearPlan</strong>
          <div className="topbar-range">
            <button type="button" className="topbar-pill-button" onClick={handleNavigatePrevious}>
              ‹
            </button>
            <button type="button" className="topbar-pill-button" onClick={handleNavigateNext}>
              ›
            </button>
            <strong className="topbar-period">{currentTitle}</strong>
          </div>
        </div>
        <div className="app-topbar-actions">
          <div className="topbar-segmented">
            <button
              type="button"
              className={view === 'year' ? 'is-active' : ''}
              onClick={() => setView('year')}
            >
              Year
            </button>
            <button
              type="button"
              className={view === 'month' ? 'is-active' : ''}
              onClick={() => setView('month')}
            >
              Month
            </button>
          </div>
          <button
            type="button"
            className="topbar-icon-button"
            onClick={() => void handleRefresh()}
            aria-label="Refresh calendars"
            disabled={loadingEvents || loadingCalendars}
          >
            ↻
          </button>
          {!accessToken && !isDemoMode && googleConfigured ? (
            <button type="button" className="button button-primary app-topbar-button" onClick={() => void signIn('consent')}>
              Connect Google
            </button>
          ) : null}
          {isDemoMode && googleConfigured && !accessToken ? (
            <button type="button" className="button button-ghost app-topbar-button" onClick={() => handleSetAppMode('google')}>
              Switch to Google
            </button>
          ) : null}
          {!accessToken && !isDemoMode ? (
            <button type="button" className="button button-ghost app-topbar-button" onClick={() => handleSetAppMode('demo')}>
              Demo
            </button>
          ) : null}
          <button
            type="button"
            className="topbar-icon-button"
            onClick={() => setRightRailCollapsed((current) => !current)}
            aria-label="Toggle filters"
          >
            ⋮
          </button>
          <button type="button" className="topbar-user-badge" onClick={() => setUserMenuOpen((current) => !current)}>
            <span className="topbar-user-avatar">{topbarUserLabel.slice(0, 1)}</span>
            <span>{topbarUserLabel}</span>
          </button>
          {userMenuOpen ? (
            <div className="topbar-user-menu">
              <strong>{topbarUserLabel}</strong>
              <span>{accessToken ? 'Connected to Google Calendar' : isDemoMode ? 'Demo mode active' : 'Preview mode'}</span>
              {accessToken ? (
                <button type="button" className="rail-link" onClick={handleDisconnectGoogle}>
                  Disconnect Google
                </button>
              ) : googleConfigured ? (
                <button type="button" className="rail-link" onClick={() => void signIn('consent')}>
                  Connect Google
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <main className={`workspace-shell ${leftRailCollapsed ? 'is-left-collapsed' : ''} ${rightRailCollapsed ? 'is-right-collapsed' : ''}`}>
        <aside className={`rail rail-left ${leftRailCollapsed ? 'is-collapsed' : ''}`}>
          <div className="rail-card">
            <div className="rail-card-header">
              <strong>My calendars</strong>
              <button type="button" className="rail-link" onClick={() => setShowCalendarPicker(true)}>
                Manage
              </button>
            </div>
            <div className="rail-stack">
              {rightSidebarCalendars.map((calendar) => {
                const enabled = (calendarFilters.length > 0 ? calendarFilters : activeCalendarIds).includes(calendar.id);
                return (
                  <button
                    key={calendar.id}
                    type="button"
                    className={`rail-item ${enabled ? 'is-active' : ''}`}
                    onClick={() => handleToggleCalendarFilter(calendar.id)}
                  >
                    <span className="rail-item-square" style={{ borderColor: calendar.backgroundColor ?? '#3f74f6' }}>
                      {enabled ? '✓' : ''}
                    </span>
                    <span className="rail-item-copy">
                      <strong>{getCalendarDisplayName(calendar)}</strong>
                      <span>{calendar.primary ? 'Primary' : 'Calendar'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="workspace-main">
          {appError ? <div className="panel error-banner">{appError}</div> : null}

          {(isDemoMode || accessToken) && calendars.length > 0 && (showCalendarPicker || emptySelection) ? (
            <CalendarPicker
              calendars={calendars}
              selectedCalendarIds={selectedCalendarIds}
              onToggleCalendar={handleToggleCalendar}
              onContinue={() => setShowCalendarPicker(false)}
            />
          ) : null}

          <section className="workspace-canvas panel">
            {showSignedOutPreview ? (
              <YearView year={year} events={displayEvents} onOpenEvent={() => undefined} />
            ) : (isDemoMode || accessToken) && calendars.length > 0 && !emptySelection && !showCalendarPicker ? (
              view === 'year' ? (
                <YearView year={year} events={displayEvents} onOpenEvent={handleOpenEvent} getPreviewDraft={getPreviewDraft} />
              ) : (
                <MonthView
                  year={year}
                  monthIndex={monthIndex}
                  events={displayEvents}
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
              )
            ) : !isDemoMode && accessToken && calendars.length === 0 && loadingCalendars ? (
              <div className="centered-state">Loading calendars…</div>
            ) : !isDemoMode && accessToken && calendars.length === 0 && !loadingCalendars ? (
              <div className="centered-state">No writable Google Calendars were found for this account.</div>
            ) : (
              <div className="centered-state">Select a calendar source to start planning.</div>
            )}
          </section>
        </section>

        {!rightRailCollapsed ? (
          <PlannerFiltersSidebar
            onToggleTypeFilter={handleToggleTypeFilter}
            typeFilters={typeFilters.length > 0 ? typeFilters : EVENT_TYPE_OPTIONS.map((option) => option.value)}
          />
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

      <StatusConsole
        accessTokenPresent={Boolean(accessToken)}
        calendarsCount={calendars.length}
        clientIdPreview={clientIdPreview}
        eventsCount={events.length}
        googleConfigured={googleConfigured}
        isOpen={diagnosticsOpen}
        lastError={appError ?? authError}
        logs={logs}
        modeLabel={isDemoMode ? 'Demo mode' : accessToken ? 'Google connected' : 'Google preview'}
        onToggle={() => setDiagnosticsOpen((current) => !current)}
        origin={window.location.origin}
      />
    </div>
  );
}
