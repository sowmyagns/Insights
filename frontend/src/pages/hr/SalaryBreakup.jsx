import { useState } from "react";

const COMPONENTS = [
  { name: "Basic", type: "50", suffix: "% of CTC" },
  { name: "DA", type: "", suffix: "" },
  { name: "HRA", type: "40", suffix: "% of Basic" },
  { name: "Other Allowance", type: "", suffix: "" },
];

export default function SalaryBreakup() {
  const [showCreate, setShowCreate] = useState(false);
  const [dept, setDept] = useState("Department Name");
  const [emp, setEmp] = useState("Employee Name");
  const [empSearch, setEmpSearch] = useState("");
  const [deptOpen, setDeptOpen] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);

  return (
    <div className="salary-breakup">
      {!showCreate ? (
        <>
          <div className="salary-breakup-header">
            <h1 className="salary-breakup-title">Salary Breakup List</h1>
            <button className="salary-add-btn" onClick={() => setShowCreate(true)}>
              + Create Salary Breakup
            </button>
          </div>

          <div className="salary-breakup-filters">
            <div className="salary-select">
              <button className="salary-select-btn" onClick={() => setDeptOpen((o) => !o)}>
                {dept}
                <span>⌄</span>
              </button>
              {deptOpen && (
                <div className="salary-select-panel">
                  <div className="salary-select-option" onClick={() => { setDept("IT"); setDeptOpen(false); }}>
                    IT
                  </div>
                </div>
              )}
            </div>
            <div className="salary-select">
              <button className="salary-select-btn" onClick={() => setEmpOpen((o) => !o)}>
                {emp}
                <span>⌄</span>
              </button>
              {empOpen && (
                <div className="salary-select-panel">
                  <div className="salary-select-search">
                    <input
                      placeholder="Search Employee"
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                    />
                  </div>
                  <div className="salary-select-option" onClick={() => { setEmp("Guguloth Sateesh"); setEmpOpen(false); }}>
                    Guguloth Sateesh
                  </div>
                </div>
              )}
            </div>
            <button className="salary-reset-btn">Reset</button>
          </div>

          <div className="leave-table-wrap">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>SR No.</th>
                  <th>Name</th>
                  <th>Created By</th>
                  <th>Updated By</th>
                  <th>Effective From</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="leave-empty">No records found</td>
                </tr>
              </tbody>
            </table>
            <div className="leave-table-footer">
              <div className="leave-entries">
                Show
                <select defaultValue="25">
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
                Entries
              </div>
              <div className="leave-pagination">Showing 0 to 0 of 0 entries</div>
              <div className="leave-pager">
                <button>‹</button>
                <button>›</button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="salary-breakup-header">
            <h1 className="salary-breakup-title">Salary Breakup</h1>
          </div>
          <div className="salary-breakup-create">
            <div className="salary-select">
              <button className="salary-select-btn" onClick={() => setEmpOpen((o) => !o)}>
                {emp}
                <span>⌄</span>
              </button>
              {empOpen && (
                <div className="salary-select-panel">
                  <div className="salary-select-search">
                    <input
                      placeholder="Search Employee"
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                    />
                  </div>
                  <div className="salary-select-option" onClick={() => { setEmp("Guguloth Sateesh"); setEmpOpen(false); }}>
                    Guguloth Sateesh
                  </div>
                </div>
              )}
            </div>
            <div className="salary-ctc-row">
              <div className="salary-ctc-label">Annual CTC</div>
              <div className="salary-ctc-input">
                <span>₹</span>
                <input placeholder="0" />
              </div>
              <button className="salary-calc-btn">Calculate</button>
              <button className="salary-reset-btn">Reset</button>
            </div>

            <div className="salary-breakup-table">
              <div className="salary-breakup-head">
                <span>Salary Components</span>
                <span>Calculation Type</span>
                <span>Monthly Pay</span>
                <span>Annual Pay</span>
              </div>
              {COMPONENTS.map((row) => (
                <div key={row.name} className="salary-breakup-row">
                  <span className="salary-breakup-name">{row.name}</span>
                  <div className="salary-breakup-calc">
                    <input defaultValue={row.type} />
                    <span className="salary-breakup-suffix">{row.suffix}</span>
                  </div>
                  <div className="salary-breakup-money">
                    <span>₹</span>
                    <input placeholder="0" />
                  </div>
                  <div className="salary-breakup-money">
                    <span>₹</span>
                    <input placeholder="0" />
                  </div>
                </div>
              ))}

              <div className="salary-breakup-row salary-breakup-total">
                <span>Gross Pay</span>
                <div className="salary-breakup-calc">
                  <input placeholder="0" />
                </div>
                <div className="salary-breakup-money">
                  <span>₹</span>
                  <input placeholder="0" />
                </div>
                <div className="salary-breakup-money">
                  <span>₹</span>
                  <input placeholder="0" />
                </div>
              </div>
              <div className="salary-breakup-row salary-breakup-total">
                <span>Total Deduction</span>
                <div className="salary-breakup-calc">
                  <input placeholder="0" />
                </div>
                <div className="salary-breakup-money">
                  <span>₹</span>
                  <input placeholder="0" />
                </div>
                <div className="salary-breakup-money">
                  <span>₹</span>
                  <input placeholder="0" />
                </div>
              </div>
              <div className="salary-breakup-row salary-breakup-total">
                <span>Net Pay</span>
                <div className="salary-breakup-calc">
                  <input placeholder="0" />
                  <div className="salary-breakup-note">(Gross Pay - Total Deduction)</div>
                </div>
                <div className="salary-breakup-money">
                  <span>₹</span>
                  <input placeholder="0" />
                </div>
                <div className="salary-breakup-money">
                  <span>₹</span>
                  <input placeholder="0" />
                </div>
              </div>
            </div>

            <div className="salary-breakup-actions">
              <button className="salary-cancel-btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="employee-save-btn">Save</button>
            </div>
          </div>
        </>
      )}
      <div className="att-footer">©2024 otuindia.com</div>
    </div>
  );
}
