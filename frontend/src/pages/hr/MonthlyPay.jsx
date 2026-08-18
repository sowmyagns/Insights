import { useState } from "react";

export default function MonthlyPay() {
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <div className="monthly-pay">
      <div className="monthly-pay-header">
        <h1 className="monthly-pay-title">Monthly Pay</h1>
        <div className="monthly-pay-year">
          <button className="leave-nav-btn" onClick={() => setYear((y) => y - 1)}>‹</button>
          <span>{year}</span>
          <button className="leave-nav-btn" onClick={() => setYear((y) => y + 1)}>›</button>
        </div>
      </div>
      <div className="monthly-pay-card">
        <div className="monthly-pay-illustration" aria-hidden="true">
          <svg width="130" height="110" viewBox="0 0 130 110" fill="none">
            <path d="M25 52c6-22 28-36 52-30 24 6 38 28 32 52-6 24-28 38-52 32S19 76 25 52Z" fill="#fde2e7" />
            <rect x="38" y="26" width="44" height="62" rx="6" fill="#4f66d8" />
            <rect x="32" y="32" width="44" height="62" rx="6" fill="#e9f2ff" />
            <circle cx="54" cy="44" r="8" fill="#9aa7ff" />
            <rect x="44" y="58" width="28" height="4" rx="2" fill="#8aa7d8" />
            <rect x="44" y="66" width="28" height="4" rx="2" fill="#8aa7d8" />
            <circle cx="88" cy="70" r="20" fill="#ff4d5a" />
            <rect x="84" y="58" width="8" height="26" rx="4" fill="#fff" />
            <circle cx="88" cy="88" r="4" fill="#fff" />
            <path d="M20 32l4 6M18 74l5-3M106 32l-4 6M110 74l-5-3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="monthly-pay-empty">No data found</div>
      </div>
      <div className="att-footer">©2024 otuindia.com</div>
    </div>
  );
}
