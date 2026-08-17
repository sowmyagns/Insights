import api from "./axiosConfig";

export const getAccountsDashboard = async () => {
  try {
    return await api.get("/accounts/dashboard");
  } catch (error) {
    console.error("[accountsApi.getAccountsDashboard] Error fetching accounts dashboard:", error.message);
    throw error;
  }
};

export const getFinanceHub = async () => {
  try {
    return await api.get("/accounts/hub");
  } catch (error) {
    console.error("[accountsApi.getFinanceHub] Error fetching finance hub:", error.message);
    throw error;
  }
};

export const getAPSummary = async () => {
  try {
    return await api.get("/accounts/ap/summary");
  } catch (error) {
    console.error("[accountsApi.getAPSummary] Error fetching AP summary:", error.message);
    throw error;
  }
};

export const getAPEnriched = async () => {
  try {
    return await api.get("/accounts/ap/enriched");
  } catch (error) {
    console.error("[accountsApi.getAPEnriched] Error fetching enriched AP data:", error.message);
    throw error;
  }
};

export const getARSummary = async () => {
  try {
    return await api.get("/accounts/ar/summary");
  } catch (error) {
    console.error("[accountsApi.getARSummary] Error fetching AR summary:", error.message);
    throw error;
  }
};

export const getAREnriched = async () => {
  try {
    return await api.get("/accounts/ar/enriched");
  } catch (error) {
    console.error("[accountsApi.getAREnriched] Error fetching enriched AR data:", error.message);
    throw error;
  }
};

export const getPaymentSummary = async () => {
  try {
    return await api.get("/accounts/payments/summary");
  } catch (error) {
    console.error("[accountsApi.getPaymentSummary] Error fetching payment summary:", error.message);
    throw error;
  }
};

export const getPaymentsEnriched = async () => {
  try {
    return await api.get("/accounts/payments/enriched");
  } catch (error) {
    console.error("[accountsApi.getPaymentsEnriched] Error fetching enriched payments data:", error.message);
    throw error;
  }
};

export const getGLSummary = async () => {
  try {
    return await api.get("/accounts/gl/summary");
  } catch (error) {
    console.error("[accountsApi.getGLSummary] Error fetching GL summary:", error.message);
    throw error;
  }
};

export const getGLEnriched = async () => {
  try {
    return await api.get("/accounts/gl/enriched");
  } catch (error) {
    const status = error.response?.status || "unknown";
    const url = error.config?.url || "/accounts/gl/enriched";
    console.error(`[accountsApi.getGLEnriched] Error (${status}): ${error.message} | URL: ${url}`);
    throw error;
  }
};

export const getProfitLoss = async (_tenantId, year, ytdMonth = 12) => {
  try {
    return await api.get("/accounts/profit-loss", {
      params: { year, ytd_month: ytdMonth },
    });
  } catch (error) {
    console.error("[accountsApi.getProfitLoss] Error fetching profit/loss report:", error.message, { year, ytdMonth });
    throw error;
  }
};

export const getProfitLossExtended = async (year) => {
  try {
    return await api.get("/accounts/profit-loss/extended", { params: { year } });
  } catch (error) {
    console.error("[accountsApi.getProfitLossExtended] Error fetching extended profit/loss report:", error.message, { year });
    throw error;
  }
};

export const getTaxReport = async (_tenantId, year) => {
  try {
    return await api.get("/accounts/tax-report", {
      params: { year },
    });
  } catch (error) {
    console.error("[accountsApi.getTaxReport] Error fetching tax report:", error.message, { year });
    throw error;
  }
};

export const getGSTExtended = async (year, month, branch) => {
  try {
    return await api.get("/accounts/gst/extended", {
      params: { year, month: month || undefined, branch: branch || undefined },
    });
  } catch (error) {
    const status = error.response?.status || "unknown";
    const url = error.config?.url || "/accounts/gst/extended";
    if (status === 400) {
      console.warn(`[accountsApi.getGSTExtended] Validation error (${status}): ${error.message} | params: {year: ${year}, month: ${month}, branch: ${branch}}`);
    } else {
      console.error(`[accountsApi.getGSTExtended] Error (${status}): ${error.message} | URL: ${url}`);
    }
    throw error;
  }
};

export const listIncome = async (_tenantId, year = null) => {
  try {
    return await api.get("/accounts/income", {
      params: { year },
    });
  } catch (error) {
    console.error("[accountsApi.listIncome] Error fetching income list:", error.message, { year });
    throw error;
  }
};

export const listExpenses = async (_tenantId, year = null) => {
  try {
    return await api.get("/accounts/expenses", {
      params: { year },
    });
  } catch (error) {
    console.error("[accountsApi.listExpenses] Error fetching expenses list:", error.message, { year });
    throw error;
  }
};

export const getExpense = async (expenseId) => {
  try {
    return await api.get(`/accounts/expenses/${expenseId}`);
  } catch (error) {
    console.error("[accountsApi.getExpense] Error fetching expense:", error.message, { expenseId });
    throw error;
  }
};

export const createExpense = async (payload) => {
  try {
    return await api.post("/accounts/expenses", payload);
  } catch (error) {
    console.error("[accountsApi.createExpense] Error creating expense:", error.message, { payload });
    throw error;
  }
};

export const updateExpense = async (expenseId, payload) => {
  try {
    return await api.put(`/accounts/expenses/${expenseId}`, payload);
  } catch (error) {
    console.error("[accountsApi.updateExpense] Error updating expense:", error.message, { expenseId, payload });
    throw error;
  }
};

export const deleteExpense = async (expenseId) => {
  try {
    return await api.delete(`/accounts/expenses/${expenseId}`);
  } catch (error) {
    console.error("[accountsApi.deleteExpense] Error deleting expense:", error.message, { expenseId });
    throw error;
  }
};

export const createIncome = async (payload) => {
  try {
    return await api.post("/accounts/income", payload);
  } catch (error) {
    console.error("[accountsApi.createIncome] Error creating income:", error.message, { payload });
    throw error;
  }
};

/** Extended finance reports (Balance Sheet, Trial Balance, Journals, Assets, etc.). */
export const getExtendedReports = async (financialYear, month, branch) => {
  try {
    return await api.get("/accounts/extended-reports", {
      params: {
        financial_year: financialYear || undefined,
        month: month || undefined,
        branch: branch || undefined,
      },
    });
  } catch (error) {
    const status = error.response?.status || "unknown";
    const url = error.config?.url || "/accounts/extended-reports";
    if (status === 400) {
      console.warn(`[accountsApi.getExtendedReports] Validation error (${status}): ${error.message} | params: {financialYear: ${financialYear}, month: ${month}, branch: ${branch}}`);
    } else {
      console.error(`[accountsApi.getExtendedReports] Error (${status}): ${error.message} | URL: ${url}`);
    }
    throw error;
  }
};

export const listJournalEntries = async () => {
  try {
    return await api.get("/accounts/journal-entries");
  } catch (error) {
    console.error("[accountsApi.listJournalEntries] Error fetching journal entries:", error.message);
    throw error;
  }
};

export const getJournalEntry = async (entryId) => {
  try {
    return await api.get(`/accounts/journal-entries/${entryId}`);
  } catch (error) {
    console.error("[accountsApi.getJournalEntry] Error fetching journal entry:", error.message, { entryId });
    throw error;
  }
};

export const createJournalEntry = async (payload) => {
  try {
    return await api.post("/accounts/journal-entries", payload);
  } catch (error) {
    console.error("[accountsApi.createJournalEntry] Error creating journal entry:", error.message, { payload });
    throw error;
  }
};

export const updateJournalEntry = async (entryId, payload) => {
  try {
    return await api.put(`/accounts/journal-entries/${entryId}`, payload);
  } catch (error) {
    console.error("[accountsApi.updateJournalEntry] Error updating journal entry:", error.message, { entryId, payload });
    throw error;
  }
};

export const deleteJournalEntry = async (entryId) => {
  try {
    return await api.delete(`/accounts/journal-entries/${entryId}`);
  } catch (error) {
    console.error("[accountsApi.deleteJournalEntry] Error deleting journal entry:", error.message, { entryId });
    throw error;
  }
};

export const listGLAccounts = async () => {
  try {
    return await api.get("/accounts/gl-accounts");
  } catch (error) {
    console.error("[accountsApi.listGLAccounts] Error fetching GL accounts:", error.message);
    throw error;
  }
};

export const getGLAccount = async (accountId) => {
  try {
    return await api.get(`/accounts/gl-accounts/${accountId}`);
  } catch (error) {
    console.error("[accountsApi.getGLAccount] Error fetching GL account:", error.message, { accountId });
    throw error;
  }
};

export const createGLAccount = async (payload) => {
  try {
    return await api.post("/accounts/gl-accounts", payload);
  } catch (error) {
    console.error("[accountsApi.createGLAccount] Error creating GL account:", error.message, { payload });
    throw error;
  }
};

export const updateGLAccount = async (accountId, payload) => {
  try {
    return await api.put(`/accounts/gl-accounts/${accountId}`, payload);
  } catch (error) {
    console.error("[accountsApi.updateGLAccount] Error updating GL account:", error.message, { accountId, payload });
    throw error;
  }
};

export const deleteGLAccount = async (accountId) => {
  try {
    return await api.delete(`/accounts/gl-accounts/${accountId}`);
  } catch (error) {
    console.error("[accountsApi.deleteGLAccount] Error deleting GL account:", error.message, { accountId });
    throw error;
  }
};

export const seedGLAccounts = async () => {
  try {
    return await api.post("/accounts/gl-accounts/seed");
  } catch (error) {
    console.error("[accountsApi.seedGLAccounts] Error seeding GL accounts:", error.message);
    throw error;
  }
};

export const listFixedAssets = async () => {
  try {
    return await api.get("/accounts/fixed-assets");
  } catch (error) {
    console.error("[accountsApi.listFixedAssets] Error fetching fixed assets:", error.message);
    throw error;
  }
};

export const getBalanceSheet = async () => {
  try {
    return await api.get("/accounts/balance-sheet");
  } catch (error) {
    console.error("[accountsApi.getBalanceSheet] Error fetching balance sheet:", error.message);
    throw error;
  }
};

export const createFixedAsset = async (payload) => {
  try {
    return await api.post("/accounts/fixed-assets", payload);
  } catch (error) {
    console.error("[accountsApi.createFixedAsset] Error creating fixed asset:", error.message, { payload });
    throw error;
  }
};

export const getTenantPref = async (key) => {
  try {
    return await api.get(`/accounts/tenant-prefs/${key}`);
  } catch (error) {
    console.error("[accountsApi.getTenantPref] Error fetching tenant preference:", error.message, { key });
    throw error;
  }
};

export const putTenantPref = (key, value) =>
  api.put(`/accounts/tenant-prefs/${key}`, { value });
