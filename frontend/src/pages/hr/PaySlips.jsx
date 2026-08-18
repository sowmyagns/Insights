export default function Payslips() {
  return (
    <div className="payslips-page">
      <div className="payslips-header">
        <button className="payslips-back">‹</button>
        <h1 className="payslips-title">My Payslips</h1>
        <select className="payslips-year">
          <option>2026</option>
          <option>2025</option>
        </select>
      </div>
      <div className="payslips-card">
        <div className="payslips-card-icon" aria-hidden="true">
          <svg width="60" height="70" viewBox="0 0 60 70" fill="none">
            <path d="M14 8h22l10 10v36a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" fill="#5B84FF" />
            <path d="M36 8v10h10" fill="#7FA2FF" />
            <rect x="18" y="30" width="24" height="4" rx="2" fill="#DDE7FF" />
            <rect x="18" y="38" width="24" height="4" rx="2" fill="#DDE7FF" />
            <rect x="18" y="46" width="20" height="4" rx="2" fill="#DDE7FF" />
          </svg>
        </div>
        <div className="payslips-card-text">No Records Found</div>
      </div>
      <div className="att-footer">©2024 otuindia.com</div>
    </div>
  );
}
