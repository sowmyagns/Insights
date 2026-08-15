import {
  createGLAccount,
  createJournalEntry,
  deleteGLAccount,
  listGLAccounts,
  updateGLAccount,
} from "./accountsApi";
import { asArray } from "../utils/apiError";

const CASH_PARENTS = new Set(["ledger:CASH", "ledger:BANK"]);
const OTHER_PARENTS = new Set(["ledger:EXPENSE", "ledger:INCOME"]);

function parseMeta(raw) {
  if (!raw) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

function normalizeGlStatus(status) {
  const raw = String(status || "Active").split("|")[0].trim().toLowerCase();
  return raw === "inactive" ? "inactive" : "active";
}

function slug(name) {
  return String(name || "acct")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function mapGlToLedgerCash(row) {
  const meta = parseMeta(row.meta);
  const accountType = String(row.parent || "").replace("ledger:", "") || meta.account_type || "CASH";
  return {
    id: String(row.id),
    apiId: row.id,
    code: row.code,
    name: row.name,
    account_type: accountType === "BANK" ? "BANK" : "CASH",
    description: meta.description || "",
    balance: Number(row.balance) || 0,
    status: normalizeGlStatus(row.status),
    holder_name: meta.holder_name || "",
    account_number: meta.account_number || "",
    ifsc: meta.ifsc || "",
    branch_name: meta.branch_name || "",
    opening_balance_date: meta.opening_balance_date || "",
    iban: meta.iban || "",
    swift: meta.swift || "",
  };
}

export function mapGlToLedgerOther(row) {
  const meta = parseMeta(row.meta);
  const accountType = String(row.parent || "").replace("ledger:", "") || meta.account_type || "EXPENSE";
  return {
    id: String(row.id),
    apiId: row.id,
    code: row.code,
    name: row.name,
    account_type: accountType === "INCOME" ? "INCOME" : "EXPENSE",
    account_group: meta.account_group || "",
    description: meta.description || "",
    balance: Number(row.balance) || 0,
    status: normalizeGlStatus(row.status),
    opening_balance_date: meta.opening_balance_date || "",
  };
}

function cashPayload(account) {
  const type = account.account_type === "BANK" ? "BANK" : "CASH";
  const code =
    account.code ||
    `ledger-${type.toLowerCase()}-${slug(account.name)}-${Date.now().toString(36).slice(-4)}`;
  return {
    code,
    name: account.name,
    parent: `ledger:${type}`,
    type: "Asset",
    balance: Number(account.balance) || 0,
    status: "Active|DR",
    meta: JSON.stringify({
      account_type: type,
      description: account.description || "",
      holder_name: account.holder_name || "",
      account_number: account.account_number || "",
      ifsc: account.ifsc || "",
      branch_name: account.branch_name || "",
      opening_balance_date: account.opening_balance_date || "",
      iban: account.iban || "",
      swift: account.swift || "",
    }),
  };
}

function otherPayload(account) {
  const type = account.account_type === "INCOME" ? "INCOME" : "EXPENSE";
  const code =
    account.code ||
    `ledger-${type.toLowerCase()}-${slug(account.name)}-${Date.now().toString(36).slice(-4)}`;
  return {
    code,
    name: account.name,
    parent: `ledger:${type}`,
    type: type === "INCOME" ? "Income" : "Expense",
    balance: Number(account.balance) || 0,
    status: type === "INCOME" ? "Active|CR" : "Active|DR",
    meta: JSON.stringify({
      account_type: type,
      account_group: account.account_group || "",
      description: account.description || "",
      opening_balance_date: account.opening_balance_date || "",
    }),
  };
}

export async function fetchLedgerCashAccounts() {
  const res = await listGLAccounts();
  return asArray(res.data)
    .filter((r) => CASH_PARENTS.has(r.parent))
    .map(mapGlToLedgerCash);
}

export async function fetchLedgerOtherAccounts() {
  const res = await listGLAccounts();
  return asArray(res.data)
    .filter((r) => OTHER_PARENTS.has(r.parent))
    .map(mapGlToLedgerOther);
}

export async function saveLedgerCashAccount(account) {
  const payload = cashPayload(account);
  if (account.apiId) {
    const res = await updateGLAccount(account.apiId, payload);
    return mapGlToLedgerCash(res.data);
  }
  const res = await createGLAccount(payload);
  return mapGlToLedgerCash(res.data);
}

export async function saveLedgerOtherAccount(account) {
  const payload = otherPayload(account);
  if (account.apiId) {
    const res = await updateGLAccount(account.apiId, payload);
    return mapGlToLedgerOther(res.data);
  }
  const res = await createGLAccount(payload);
  return mapGlToLedgerOther(res.data);
}

export async function deleteLedgerAccount(apiId) {
  await deleteGLAccount(apiId);
}

export async function adjustLedgerBalance({ account, type, amount, remark }) {
  const amt = Number(amount) || 0;
  const bal = Number(account.balance) || 0;
  const nextBal = type === "add" ? bal + amt : bal - amt;
  const updated = await updateGLAccount(account.apiId, {
    balance: nextBal,
    meta: JSON.stringify({
      ...parseMeta(
        typeof account === "object"
          ? {
              description: account.description,
              holder_name: account.holder_name,
              account_number: account.account_number,
              ifsc: account.ifsc,
              branch_name: account.branch_name,
              opening_balance_date: account.opening_balance_date,
              iban: account.iban,
              swift: account.swift,
              account_type: account.account_type,
            }
          : {}
      ),
      description: remark || account.description || "",
      account_type: account.account_type,
    }),
  });
  try {
    await createJournalEntry({
      date: new Date().toISOString().slice(0, 10),
      ref: type === "add" ? "Receipt" : "Payment",
      desc: remark || (type === "add" ? "Money added" : "Money withdrawn"),
      status: "Posted",
      branch: "Head Office",
      legs: [
        {
          account: account.name,
          debit: type === "add" ? amt : 0,
          credit: type === "add" ? 0 : amt,
        },
        {
          account: type === "add" ? "Opening Balance Equity" : "Drawings",
          debit: type === "add" ? 0 : amt,
          credit: type === "add" ? amt : 0,
        },
      ],
    });
  } catch {
    /* balance already updated */
  }
  return mapGlToLedgerCash(updated.data);
}

export async function contraLedgerEntry({ fromAccount, toAccount, amount, remark }) {
  const amt = Number(amount) || 0;
  const fromBal = Number(fromAccount.balance) || 0;
  const toBal = Number(toAccount.balance) || 0;
  await updateGLAccount(fromAccount.apiId, { balance: fromBal - amt });
  await updateGLAccount(toAccount.apiId, { balance: toBal + amt });
  try {
    await createJournalEntry({
      date: new Date().toISOString().slice(0, 10),
      ref: "Contra",
      desc: remark || `Contra ${fromAccount.name} → ${toAccount.name}`,
      status: "Posted",
      branch: "Head Office",
      legs: [
        { account: toAccount.name, debit: amt, credit: 0 },
        { account: fromAccount.name, debit: 0, credit: amt },
      ],
    });
  } catch {
    /* balances already updated */
  }
}
