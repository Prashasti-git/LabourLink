export default function Toast({ toast }) {
  return <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
    <span>{toast?.message || 'Done!'}</span>
  </div>;
}
