import { useId } from "react";

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="ui-page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </header>
  );
}

export function Card({ children, className = "", as: Component = "section" }) {
  return <Component className={`panel-card ui-card ${className}`.trim()}>{children}</Component>;
}

export function StatusBadge({ status, children }) {
  const value = String(status || children || "Unknown");
  const tone = value.toLowerCase().replace(/\s+/g, "-");
  return <span className={`status-badge ${tone}`}>{children || value}</span>;
}

export function ProgressBar({ value = 0, label, detail }) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="ui-progress" aria-label={label ? `${label}: ${progress}%` : `${progress}% complete`}>
      {(label || detail) && <div className="ui-progress__meta"><span>{label}</span><strong>{detail || `${progress}%`}</strong></div>}
      <div className="ui-progress__track"><i style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", description, action }) {
  return <div className="empty-state ui-empty-state"><strong>{title}</strong>{description && <p>{description}</p>}{action}</div>;
}

export function Skeleton({ lines = 3 }) {
  return <div className="ui-skeleton" aria-label="Loading" role="status">{Array.from({ length: lines }, (_, index) => <i key={index} />)}</div>;
}

export function Modal({ title, description, children, onClose, className = "" }) {
  return (
    <div className="ui-overlay" role="presentation" onMouseDown={onClose} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <section className={`ui-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="ui-modal__header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="ghost-btn" onClick={onClose}>Close</button></div>
        {children}
      </section>
    </div>
  );
}

export function ConfirmDialog({ title = "Confirm action", description, confirmLabel = "Confirm", tone = "primary", onCancel, onConfirm, loading = false }) {
  return (
    <Modal title={title} description={description} onClose={onCancel} className="ui-confirm-dialog">
      <div className="ui-confirm-dialog__actions"><button type="button" className="secondary-btn" onClick={onCancel} disabled={loading}>Cancel</button><button type="button" className={tone === "danger" ? "secondary-btn ui-btn-danger" : "primary-btn"} onClick={onConfirm} disabled={loading}>{loading ? "Working…" : confirmLabel}</button></div>
    </Modal>
  );
}

export function FilterPanel({ children, actions, className = "" }) {
  return <div className={`notification-toolbar ui-filter-panel ${className}`.trim()}><div className="ui-filter-panel__fields">{children}</div>{actions && <div className="ui-filter-panel__actions">{actions}</div>}</div>;
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return <nav className="ui-pagination" aria-label="Pagination"><button className="secondary-btn" type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button className="secondary-btn" type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button></nav>;
}

export function FilePicker({ file, onChange, accept = "application/pdf,image/jpeg,image/png", disabled = false, label = "Choose a file", hint = "PDF, JPEG, or PNG · 5 MB maximum" }) {
  const inputId = useId();
  return <label htmlFor={inputId} className={`ui-file-picker ${disabled ? "is-disabled" : ""}`}><input id={inputId} type="file" accept={accept} disabled={disabled} onChange={(event) => onChange(event.target.files?.[0] || null)} /><strong>{file?.name || label}</strong><small>{file ? "Choose another file" : hint}</small></label>;
}

export function KpiWidget({ label, value, detail, tone = "blue" }) {
  return <article className={`metric-card ui-kpi ui-kpi--${tone}`}><p className="eyebrow">{label}</p><strong>{value}</strong>{detail && <p>{detail}</p>}</article>;
}

export function DataTable({ columns, rows, getRowKey, emptyTitle = "No results found", emptyDescription, onRowClick }) {
  if (!rows.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return <div className="ui-data-table-wrap"><table className="ui-data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={getRowKey?.(row) ?? index} onClick={() => onRowClick?.(row)} onKeyDown={(event) => { if (onRowClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onRowClick(row); } }} tabIndex={onRowClick ? 0 : undefined} className={onRowClick ? "ui-data-table__row-action" : ""}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}

export function Timeline({ items, emptyTitle = "No activity yet" }) {
  if (!items.length) return <EmptyState title={emptyTitle} />;
  return <div className="ui-timeline">{items.map((item, index) => <div className="ui-timeline__item" key={item.id || `${item.title}-${index}`}><i /><div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}{item.meta && <small>{item.meta}</small>}</div></div>)}</div>;
}

export function Drawer({ open, title, description, children, onClose, position = "right" }) {
  if (!open) return null;
  return <div className={`ui-drawer-backdrop ui-drawer-backdrop--${position}`} onMouseDown={onClose} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}><aside className="ui-drawer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><div className="ui-modal__header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button className="ghost-btn" type="button" onClick={onClose}>Close</button></div>{children}</aside></div>;
}

export function ChartCard({ title, description, children, className = "" }) {
  return <Card className={`chart-card ui-chart-card ${className}`.trim()}><div className="panel-head"><div><h3>{title}</h3>{description && <p className="panel-subtitle">{description}</p>}</div></div>{children}</Card>;
}

export function FormField({ label, htmlFor, error, hint, children, className = "" }) {
  return <div className={`field ui-form-field ${className}`.trim()}>
    {label && <label htmlFor={htmlFor}>{label}</label>}
    {children}
    {error ? <p className="ui-field-error" role="alert">{error}</p> : hint ? <p className="helper-text">{hint}</p> : null}
  </div>;
}
