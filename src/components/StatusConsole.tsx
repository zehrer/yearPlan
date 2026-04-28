interface AppLogEntry {
  id: number;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  timestamp: string;
}

interface StatusConsoleProps {
  accessTokenPresent: boolean;
  calendarsCount: number;
  clientIdPreview: string;
  eventsCount: number;
  googleConfigured: boolean;
  isOpen: boolean;
  lastError: string | null;
  logs: AppLogEntry[];
  modeLabel: string;
  onToggle: () => void;
  origin: string;
}

export function StatusConsole({
  accessTokenPresent,
  calendarsCount,
  clientIdPreview,
  eventsCount,
  googleConfigured,
  isOpen,
  lastError,
  logs,
  modeLabel,
  onToggle,
  origin,
}: StatusConsoleProps) {
  const latestLog = logs[logs.length - 1];

  return (
    <aside className={`status-console ${isOpen ? 'is-open' : ''}`}>
      <button type="button" className="status-console-toggle" onClick={onToggle}>
        <span className={`status-indicator ${googleConfigured ? 'is-ok' : 'is-warn'}`} />
        <strong>{isOpen ? 'Hide status' : 'Open status'}</strong>
        <span className="status-console-summary">
          {modeLabel} · Google {googleConfigured ? 'configured' : 'missing'} · {logs.length} logs
        </span>
      </button>

      {isOpen ? (
        <div className="status-console-panel">
          <div className="status-console-grid">
            <div>
              <span>Mode</span>
              <strong>{modeLabel}</strong>
            </div>
            <div>
              <span>Google build config</span>
              <strong>{googleConfigured ? 'present' : 'missing'}</strong>
            </div>
            <div>
              <span>Client id</span>
              <strong>{clientIdPreview}</strong>
            </div>
            <div>
              <span>Origin</span>
              <strong>{origin}</strong>
            </div>
            <div>
              <span>Access token</span>
              <strong>{accessTokenPresent ? 'present' : 'missing'}</strong>
            </div>
            <div>
              <span>Calendars / events</span>
              <strong>
                {calendarsCount} / {eventsCount}
              </strong>
            </div>
          </div>

          <div className="status-console-stream">
            <div className="status-console-stream-header">
              <strong>Runtime log</strong>
              {latestLog ? <span>Latest: {latestLog.source}</span> : null}
            </div>
            <div className="status-console-entries">
              {logs.map((log) => (
                <div key={log.id} className={`status-log-entry is-${log.level}`}>
                  <span className="status-log-time">{log.timestamp}</span>
                  <span className="status-log-source">{log.source}</span>
                  <span className="status-log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          {lastError ? (
            <div className="status-console-error">
              <strong>Last error</strong>
              <span>{lastError}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
