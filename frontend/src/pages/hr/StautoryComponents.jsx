import { useState } from "react";

const STATES = [
  "Andaman and nicobar islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
];

export default function StatutoryComponents() {
  const [tab, setTab] = useState("pf");
  const [edit, setEdit] = useState(null);
  const [showState, setShowState] = useState(false);
  const [showPfComponents, setShowPfComponents] = useState(false);

  const resetEdit = () => setEdit(null);

  return (
    <div className="statutory-page">
      <div className="statutory-title">Statutory Components</div>
      <div className="statutory-tabs">
        <button className={`statutory-tab ${tab === "pf" ? "active" : ""}`} onClick={() => { setTab("pf"); resetEdit(); }}>
          Provident Fund (P.F)
        </button>
        <button className={`statutory-tab ${tab === "pt" ? "active" : ""}`} onClick={() => { setTab("pt"); resetEdit(); }}>
          Professional Tax
        </button>
        <button className={`statutory-tab ${tab === "esic" ? "active" : ""}`} onClick={() => { setTab("esic"); resetEdit(); }}>
          ESIC
        </button>
      </div>

      {tab === "pt" && !edit && (
        <div className="statutory-card">
          <div className="statutory-card-title">Professional Tax Calculation</div>
          <button className="statutory-btn" onClick={() => setEdit("pt")}>Add</button>
        </div>
      )}

      {tab === "esic" && !edit && (
        <div className="statutory-card">
          <div className="statutory-card-title">Employee&apos;s State Insurance</div>
          <div className="statutory-card-row">
            <span>ESIC Number : --</span>
            <span>Employee&apos;s Contribution : --</span>
            <span>Employer&apos;s Contribution : --</span>
            <span>Deduction : Monthly</span>
            <span>Mark this as Active :</span>
            <label className="salary-toggle">
              <input type="checkbox" />
              <span />
            </label>
            <button className="statutory-btn" onClick={() => setEdit("esic")}>Edit</button>
          </div>
        </div>
      )}

      {tab === "pf" && !edit && (
        <div className="statutory-card">
          <div className="statutory-card-title">Provident Fund Calculation</div>
          <div className="statutory-card-grid">
            <span>EPF Number : --</span>
            <span>Deduction Cycle : --</span>
            <span>Employer Contribution Rate : 12% of Actual PF Wage</span>
            <span>Employee Contribution Rate : 12% of Actual PF Wage</span>
            <span>Set the minimum limit of deduction to Rs.1800/- : No</span>
            <span>CTC Inclusions : No</span>
            <span>Component for PF Calculation : --</span>
            <span>Mark this as Active :</span>
            <label className="salary-toggle">
              <input type="checkbox" />
              <span />
            </label>
          </div>
          <div className="statutory-card-footer">
            <button className="statutory-btn" onClick={() => setEdit("pf")}>Edit</button>
          </div>
        </div>
      )}

      {tab === "pf" && edit === "pf" && (
        <div className="statutory-form">
          <div className="statutory-section-title">Provident Fund Calculation</div>
          <div className="statutory-row">
            <div>
              <label className="leave-label">EPF Number</label>
              <input className="leave-input" />
            </div>
            <div>
              <label className="leave-label">Deduction Cycle</label>
              <input className="leave-input" placeholder="Monthly" />
            </div>
          </div>
          <div className="statutory-row">
            <div>
              <label className="leave-label">Employee Contribution Rate</label>
              <div className="leave-input with-icon">
                <input type="number" defaultValue="12" />
                <span className="leave-input-icon">% of Actual PF Wage</span>
              </div>
            </div>
            <div>
              <label className="leave-label">Employer Contribution Rate</label>
              <div className="leave-input with-icon">
                <input type="number" defaultValue="12" />
                <span className="leave-input-icon">% of Actual PF Wage</span>
              </div>
            </div>
          </div>
          <div>
            <label className="leave-label">Select Component for PF Calculation</label>
            <div className="statutory-select" onClick={() => setShowPfComponents((s) => !s)}>
              <span>Select Component</span>
              <span>⌄</span>
            </div>
            {showPfComponents && (
              <div className="statutory-dropdown">
                <input className="statutory-search" placeholder="Search" />
                {["Basic", "DA", "HRA"].map((c) => (
                  <label key={c} className="statutory-check">
                    <input type="checkbox" />
                    <span />
                    {c}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="statutory-checks">
            <label className="statutory-check">
              <input type="checkbox" />
              <span />
              Set the minimum limit of deduction to Rs.1800/-
            </label>
            <label className="statutory-check">
              <input type="checkbox" />
              <span />
              Include employer&apos;s contribution in the CTC
            </label>
            <label className="statutory-check">
              <input type="checkbox" />
              <span />
              Mark this as Active
            </label>
          </div>
          <div className="statutory-note">
            <div>PF Contribution Adjustment</div>
            <div>• If the monthly basic + DA exceeds ₹15,000, contributions are typically calculated based on your PF wages without any change.</div>
            <div>• If the monthly basic + DA is below ₹15,000, contributions are calculated proportionately each month.</div>
          </div>
          <div className="statutory-actions">
            <button className="statutory-cancel" onClick={resetEdit}>Cancel</button>
            <button className="employee-save-btn" onClick={resetEdit}>Save</button>
          </div>
        </div>
      )}

      {tab === "pt" && edit === "pt" && (
        <div className="statutory-form">
          <div className="statutory-section-title">Professional Tax Calculation</div>
          <div className="statutory-row">
            <div>
              <label className="leave-label">PT Number</label>
              <input className="leave-input" />
            </div>
            <div>
              <label className="leave-label">Work Location</label>
              <div className="statutory-select" onClick={() => setShowState((s) => !s)}>
                <span>Select State</span>
                <span>⌄</span>
              </div>
              {showState && (
                <div className="statutory-dropdown">
                  <input className="statutory-search" placeholder="Search" />
                  {STATES.map((s) => (
                    <div key={s} className="statutory-option">{s}</div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="leave-label">Deduction Cycle</label>
              <input className="leave-input" placeholder="Monthly" />
            </div>
          </div>
          <div className="statutory-table">
            <div className="statutory-table-title">Tax Slabs based on Monthly Gross Salary</div>
            <div className="statutory-table-head">
              <span>Start Range (₹)</span>
              <span>End Range (₹)</span>
              <span>Monthly TAX Amount (₹)</span>
            </div>
            <div className="statutory-table-row">
              <input className="leave-input" placeholder="Enter Start Range" />
              <input className="leave-input" placeholder="Enter End Range" />
              <input className="leave-input" placeholder="Enter Tax Amount" />
            </div>
            <button className="statutory-add-row">+ Add Slab</button>
          </div>
          <div className="statutory-radios">
            <label className="salary-radio">
              <input type="radio" defaultChecked />
              <span />
              Apply PT slab dynamically based on monthly gross salary
            </label>
            <label className="salary-radio">
              <input type="radio" />
              <span />
              Use fixed PT slab as configured in salary structure
            </label>
          </div>
          <label className="statutory-check">
            <input type="checkbox" />
            <span />
            Mark this as Active
          </label>
          <div className="statutory-actions">
            <button className="statutory-cancel" onClick={resetEdit}>Cancel</button>
            <button className="employee-save-btn" onClick={resetEdit}>Save</button>
          </div>
        </div>
      )}

      {tab === "esic" && edit === "esic" && (
        <div className="statutory-form">
          <div className="statutory-section-title">Employee&apos;s State Insurance</div>
          <div>
            <label className="leave-label">ESIC Number</label>
            <input className="leave-input" />
          </div>
          <div className="statutory-row">
            <div>
              <label className="leave-label">Employee&apos;s Contribution</label>
              <div className="leave-input with-icon">
                <input type="number" defaultValue="0.75" />
                <span className="leave-input-icon">% of Gross Pay</span>
              </div>
            </div>
            <div>
              <label className="leave-label">Employer&apos;s Contribution</label>
              <div className="leave-input with-icon">
                <input type="number" defaultValue="3.25" />
                <span className="leave-input-icon">% of Gross Pay</span>
              </div>
            </div>
          </div>
          <label className="statutory-check">
            <input type="checkbox" />
            <span />
            Include employer&apos;s contribution in the CTC
          </label>
          <div className="statutory-esic">
            <div className="statutory-esic-title">ESIC deductions</div>
            <label className="salary-radio">
              <input type="radio" defaultChecked />
              <span />
              ESIC deductions will be made only if the employee&apos;s monthly salary is less than or equal to ₹21,000.
            </label>
            <label className="salary-radio">
              <input type="radio" />
              <span />
              Include ESIC deductions for all employees.
            </label>
          </div>
          <label className="statutory-check">
            <input type="checkbox" />
            <span />
            Mark this as Active
          </label>
          <div className="statutory-actions">
            <button className="statutory-cancel" onClick={resetEdit}>Cancel</button>
            <button className="employee-save-btn" onClick={resetEdit}>Save</button>
          </div>
        </div>
      )}

      <div className="att-footer">©2024 otuindia.com</div>
    </div>
  );
}
