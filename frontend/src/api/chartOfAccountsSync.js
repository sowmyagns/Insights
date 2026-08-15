import {
  createGLAccount,
  deleteGLAccount,
  listGLAccounts,
  seedGLAccounts,
  updateGLAccount,
} from "./accountsApi";
import { asArray } from "../utils/apiError";
import { DEFAULT_CHART_OF_ACCOUNTS } from "../data/chartOfAccounts";

const SIDE_BY_TYPE = {
  Asset: "DR",
  Expense: "DR",
  Liability: "CR",
  Income: "CR",
  Equity: "CR",
};

function isTransientNetworkError(err) {
  if (err?.response) return false;
  const code = String(err?.code || "");
  const message = String(err?.message || "");
  return (
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    message.includes("Network Error") ||
    message.includes("ERR_CONNECTION_RESET")
  );
}

/** Retry when the backend restarts mid-request (common during dev hot reload). */
async function withTransientRetry(fn, { attempts = 3, baseDelayMs = 400 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientNetworkError(err) || attempt === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}

function parseStatus(status) {
  const raw = String(status || "Active");
  const [st, side] = raw.split("|");
  return { status: st || "Active", side: side || null };
}

/** Map GL row → Chart of Accounts V2 shape */
export function mapGlToUi(row) {
  const { status, side } = parseStatus(row.status);
  const isSub = String(row.parent || "").startsWith("sub:");
  const parentCode = isSub ? String(row.parent).slice(4) : null;
  const codeParts = String(row.code || "").split("__");
  return {
    id: isSub && codeParts.length > 1 ? codeParts[1] : row.code,
    apiId: row.id,
    code: row.code,
    name: row.name,
    type: row.type || "Asset",
    group: isSub ? parentCode : row.parent || "Current Asset",
    parentId: parentCode,
    isSubAccount: isSub,
    balance: Number(row.balance) || 0,
    openingBalance: Number(row.balance) || 0,
    side: side || SIDE_BY_TYPE[row.type] || "DR",
    status,
    custom: true,
    childCount: 0,
    updatedAt: row.updated_at || null,
  };
}

/** Keep one main account per code when the API returns duplicate rows. */
export function dedupeGlRows(rows) {
  const byCode = new Map();
  for (const row of rows) {
    const code = String(row?.code || "");
    if (!code) continue;
    const prev = byCode.get(code);
    if (!prev || Number(row.id) < Number(prev.id)) {
      byCode.set(code, row);
    }
  }
  return [...byCode.values()];
}

export function mapUiToGlPayload(account, { isSub = false, parentCode = null } = {}) {
  const side = account.side || SIDE_BY_TYPE[account.type] || "DR";
  const code = isSub
    ? `${parentCode}__${account.id || account.code || `sub-${Date.now()}`}`
    : account.id || account.code || `acc-${Date.now()}`;
  return {
    code,
    name: account.name,
    parent: isSub ? `sub:${parentCode}` : account.group || "Current Asset",
    type: account.type || "Asset",
    balance: Number(account.balance) || 0,
    status: `Active|${side}`,
  };
}

export async function fetchChartOfAccounts() {
  let res = await withTransientRetry(() => listGLAccounts());
  let rows = asArray(res.data);
  if (!rows.length) {
    try {
      res = await withTransientRetry(() => seedGLAccounts());
      rows = asArray(res.data);
    } catch {
      /* seed may fail if race; fall through */
      res = await withTransientRetry(() => listGLAccounts());
      rows = asArray(res.data);
    }
  }
  if (!rows.length) {
    // Last resort: show defaults in UI but they are not persisted until seed works
    return DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({ ...a }));
  }
  rows = dedupeGlRows(rows);
  const mapped = rows.map(mapGlToUi);
  const mains = mapped.filter((a) => !a.isSubAccount);
  const subs = mapped.filter((a) => a.isSubAccount);
  return mains.map((m) => ({
    ...m,
    childCount: subs.filter((s) => s.parentId === m.id || s.parentId === m.code).length,
  }));
}

export async function fetchSubAccounts(parentCode) {
  const res = await withTransientRetry(() => listGLAccounts());
  const rows = dedupeGlRows(asArray(res.data));
  return rows
    .map(mapGlToUi)
    .filter((a) => a.isSubAccount && (a.parentId === parentCode || a.group === parentCode));
}

export async function createChartAccount(account) {
  const payload = mapUiToGlPayload(account, { isSub: false });
  const res = await createGLAccount(payload);
  return mapGlToUi(res.data);
}

export async function createSubAccount(parentCode, account) {
  const payload = mapUiToGlPayload(
    { ...account, id: account.id || `sub-${Date.now()}` },
    { isSub: true, parentCode }
  );
  const res = await createGLAccount(payload);
  return mapGlToUi(res.data);
}

export async function updateChartAccount(apiId, account) {
  const isSub = Boolean(account.isSubAccount || account.parentId);
  const payload = mapUiToGlPayload(account, {
    isSub,
    parentCode: account.parentId,
  });
  const res = await updateGLAccount(apiId, payload);
  return mapGlToUi(res.data);
}

export async function deleteChartAccount(apiId) {
  await deleteGLAccount(apiId);
  return apiId;
}

export async function fetchJournalAccountOptions() {
  const accounts = await fetchChartOfAccounts();
  const subs = [];
  for (const a of accounts) {
    const children = await fetchSubAccounts(a.id);
    children.forEach((c) =>
      subs.push({ value: c.code || c.id, label: `${a.name} › ${c.name}` })
    );
  }
  return [
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
    ...subs,
  ];
}
