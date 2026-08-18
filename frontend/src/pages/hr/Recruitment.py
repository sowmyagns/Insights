import { useState } from "react";
import { api } from "../api";
import { DEPTS } from "../data/mockData";
import { fmtDate } from "../utils/format";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Field from "../components/Field";

const emptyJob = {
  title: "",
  dept: "Engineering",
  location: "Remote",
  applicants: "0",
  posted: new Date().toISOString().split("T")[0],
  description: "",
};

export default function Recruitment({ jobs, setJobs, apiMode, refreshFromApi }) {
  const [filter, setFilter] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyJob);

  const filtered = !filter ? jobs : jobs.filter((j) => j.status === filter);

  const pipeline = [
    { s: "Applied", n: jobs.reduce((a, j) => a + j.applicants, 0), c: "var(--accent)" },
    {
      s: "Screening",
      n: Math.floor(jobs.reduce((a, j) => a + j.applicants, 0) * 0.38),
      c: "var(--accent2)",
    },
    {
      s: "Interview",
      n: Math.floor(jobs.reduce((a, j) => a + j.applicants, 0) * 0.19),
      c: "var(--yellow)",
    },
    {
      s: "Offer",
      n: Math.floor(jobs.reduce((a, j) => a + j.applicants, 0) * 0.07),
      c: "var(--orange)",
    },
    {
      s: "Hired",
      n: Math.floor(jobs.reduce((a, j) => a + j.applicants, 0) * 0.025),
      c: "var(--green)",
    },
  ];

  const addJob = async () => {
    if (!form.title) return;
    if (apiMode && refreshFromApi) {
      await api.jobs.create({
        title: form.title,
        dept: form.dept,
        location: form.location,
        applicants: Number(form.applicants) || 0,
        status: "Open",
        posted: form.posted,
        description: form.description || null,
      });
      await refreshFromApi();
      setShowNew(false);
      setForm(emptyJob);
      return;
    }
    setJobs([{ id: Date.now(), ...form, applicants: Number(form.applicants) || 0, status: "Open" }, ...jobs]);
    setShowNew(false);
    setForm(emptyJob);
  };

  const toggle = async (id) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    if (apiMode && refreshFromApi) {
      await api.jobs.update(id, { status: job.status === "Open" ? "Closed" : "Open" });
      await refreshFromApi();
      return;
    }
    setJobs(jobs.map((j) => (j.id === id ? { ...j, status: j.status === "Open" ? "Closed" : "Open" } : j)));
  };
  const del = async (id) => {
    if (apiMode && refreshFromApi) {
      await api.jobs.delete(id);
      await refreshFromApi();
      return;
    }
    setJobs(jobs.filter((j) => j.id !== id));
  };

  return (
    <div className="fa">
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {pipeline.map((p, i) => (
          <div key={i} className="card" style={{ flex: 1, textAlign: "center", padding: 14 }}>
            <div style={{ fontSize: 24, fontFamily: "Syne", fontWeight: 800, color: p.c }}>
              {p.n}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>{p.s}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {[
            ["All", ""],
            ["Open", "Open"],
            ["Closed", "Closed"],
          ].map(([l, v]) => (
            <button
              key={v}
              className={`btn bsm ${filter === v ? "bp" : "bo"}`}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          className="btn bp"
          onClick={() => {
            setForm(emptyJob);
            setShowNew(true);
          }}
        >
          + Post Position
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {filtered.map((j) => (
          <div key={j.id} className="card card-sm" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 13 }}>{j.title}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                {j.dept} · {j.location} · Posted {fmtDate(j.posted)}
              </div>
            </div>
            <div style={{ textAlign: "center", minWidth: 55 }}>
              <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20, color: "var(--accent)" }}>
                {j.applicants}
              </div>
              <div style={{ fontSize: 9, color: "var(--muted)" }}>Applicants</div>
            </div>
            <Badge status={j.status} />
            <button className="btn bo bsm" onClick={() => toggle(j.id)}>
              {j.status === "Open" ? "Close" : "Reopen"}
            </button>
            <button className="btn bd bsm" onClick={() => del(j.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {showNew && (
        <Modal
          title="Post New Position"
          sub="Create a new job listing"
          onClose={() => setShowNew(false)}
          actions={
            <>
              <button className="btn bo" onClick={() => setShowNew(false)}>
                Cancel
              </button>
              <button className="btn bp" onClick={addJob}>
                Post Position
              </button>
            </>
          }
        >
          <Field label="Job Title">
            <input
              className="fi"
              placeholder="e.g. Senior PM"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <div className="g2">
            <Field label="Department">
              <select
                className="fi"
                value={form.dept}
                onChange={(e) => setForm({ ...form, dept: e.target.value })}
              >
                {DEPTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Work Type">
              <select
                className="fi"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              >
                {["Remote", "Hybrid", "On-site"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Applicants">
              <input
                className="fi"
                type="number"
                value={form.applicants}
                onChange={(e) => setForm({ ...form, applicants: e.target.value })}
              />
            </Field>
            <Field label="Posted Date">
              <input
                className="fi"
                type="date"
                value={form.posted}
                onChange={(e) => setForm({ ...form, posted: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className="fi"
              placeholder="Brief job description…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </Modal>
      )}
    </div>
  );
}
