export default function AssetManagement({ view }) {
  const title = view === "assets-allocate"
    ? "Allocate Assets"
    : view === "assets-mapped"
      ? "Mapped Assets"
      : "Company Assets";
  const emptyText = view === "assets-allocate"
    ? "No assets allocated"
    : view === "assets-mapped"
      ? "No mapped assets"
      : "";
  return (
    <div className="assets-page">
      <div className="assets-header">
        <h1 className="assets-title">{title}</h1>
      </div>
      <div className="assets-empty-card">
        <div className="assets-empty-illustration" aria-hidden="true">
          {view === "assets-allocate" ? (
            <svg width="110" height="90" viewBox="0 0 110 90" fill="none">
              <rect x="30" y="12" width="40" height="56" rx="6" fill="#ffffff" stroke="#9aa0a6" strokeWidth="3" />
              <rect x="22" y="18" width="40" height="56" rx="6" fill="#ffffff" stroke="#9aa0a6" strokeWidth="3" />
              <circle cx="80" cy="30" r="9" fill="#ffffff" stroke="#111827" strokeWidth="2" />
              <circle cx="80" cy="50" r="9" fill="#ffffff" stroke="#111827" strokeWidth="2" />
              <circle cx="80" cy="70" r="9" fill="#ffffff" stroke="#111827" strokeWidth="2" />
              <path d="M77 30h6M80 27v6" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
              <path d="M76 50h8" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
              <path d="M76 70h8" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : view === "assets-mapped" ? (
            <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
              <path d="M24 58c8-8 16-8 24 0" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
              <path d="M20 62h36" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
              <circle cx="62" cy="36" r="10" fill="#ffffff" stroke="#111827" strokeWidth="3" />
              <circle cx="82" cy="26" r="10" fill="#ffffff" stroke="#111827" strokeWidth="3" />
              <circle cx="88" cy="50" r="10" fill="#ffffff" stroke="#111827" strokeWidth="3" />
              <rect x="56" y="32" width="12" height="8" rx="2" fill="#111827" />
              <rect x="76" y="22" width="12" height="8" rx="2" fill="#111827" />
              <rect x="82" y="46" width="12" height="8" rx="2" fill="#111827" />
              <path d="M50 58c10-8 18-8 28 0" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="110" height="90" viewBox="0 0 110 90" fill="none">
              <rect x="28" y="8" width="48" height="64" rx="6" fill="#ffffff" stroke="#9aa0a6" strokeWidth="3" />
              <rect x="22" y="14" width="48" height="64" rx="6" fill="#ffffff" stroke="#9aa0a6" strokeWidth="3" />
              <rect x="40" y="20" width="24" height="10" rx="5" fill="#dbeafe" />
              <rect x="40" y="36" width="20" height="4" rx="2" fill="#cbd5e1" />
              <rect x="40" y="46" width="20" height="4" rx="2" fill="#cbd5e1" />
              <circle cx="78" cy="58" r="14" fill="#e0ecff" stroke="#60a5fa" strokeWidth="3" />
              <path d="M78 50v16M70 58h16" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
        </div>
        {view === "assets-allocate" || view === "assets-mapped" ? (
          <div className="assets-empty-text">{emptyText}</div>
        ) : (
          <button className="assets-add-btn">+ Add Category</button>
        )}
      </div>
    </div>
  );
}
