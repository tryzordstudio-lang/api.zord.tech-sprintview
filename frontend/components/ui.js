export function PageIntro({ eyebrow, title, description, actions }) {
  return (
    <section className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="page-description">{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </section>
  );
}

export function Surface({ title, subtitle, actions, className = "", children }) {
  return (
    <section className={`surface ${className}`}>
      {(title || actions || subtitle) ? (
        <header className="surface-header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="surface-actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function MetricCard({ label, value, unit, detail, tone = "default" }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <span className="metric-label">{label}</span>
      <div className="metric-value-row">
        <strong>{value}</strong>
        {unit ? <span className="metric-unit">{unit}</span> : null}
      </div>
      <p className="metric-detail">{detail}</p>
    </article>
  );
}

export function StatusPill({ tone = "default", children }) {
  return <span className={`status-pill tone-${tone}`}>{children}</span>;
}

export function InsightCard({ category, severity, title, summary, recommendation }) {
  return (
    <article className={`insight-card severity-${severity}`}>
      <div className="insight-meta">
        <StatusPill tone={severity}>{category}</StatusPill>
      </div>
      <h4>{title}</h4>
      <p>{summary}</p>
      <div className="insight-recommendation">
        <span>Recommendation</span>
        <strong>{recommendation}</strong>
      </div>
    </article>
  );
}

export function HealthRing({ score, label }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="health-ring-card">
      <div className="health-ring">
        <svg viewBox="0 0 140 140" className="health-ring-svg" aria-label={`Health score ${score}`}>
          <circle className="health-ring-track" cx="70" cy="70" r={radius} />
          <circle
            className="health-ring-progress"
            cx="70"
            cy="70"
            r={radius}
            style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
          />
        </svg>
        <div className="health-ring-copy">
          <strong>{score}</strong>
          <span>Health</span>
        </div>
      </div>
      <p className="health-ring-label">{label}</p>
    </div>
  );
}

export function KeyValueList({ items }) {
  return (
    <dl className="key-value-list">
      {items.map((item) => (
        <div key={item.label} className="key-value-row">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DataTable({ columns, rows, compact = false }) {
  return (
    <div className={`table-wrap ${compact ? "is-compact" : ""}`}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id || rowIndex}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel
}) {
  return (
    <>
      <button
        className={`modal-scrim ${open ? "is-visible" : ""}`}
        aria-label="Close confirmation dialog"
        onClick={onCancel}
      />
      <div className={`modal-wrap ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <section className={`confirm-dialog tone-${tone}`} role="dialog" aria-modal="true" aria-label={title}>
          <div className="confirm-dialog-copy">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <div className="confirm-dialog-actions">
            <button className="button-secondary" type="button" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </button>
            <button className={`button ${tone === "danger" ? "button-danger" : ""}`} type="button" onClick={onConfirm} disabled={busy}>
              {busy ? "Processing..." : confirmLabel}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
