export default function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="ui-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="ui-modal max-w-lg text-left" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-[18px] font-bold text-[var(--color-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--color-surface-muted)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
          >
            Close
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
