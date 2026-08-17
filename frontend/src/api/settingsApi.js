import api from "./axiosConfig";

export const getCompanySettings = async () => {
  try {
    return await api.get("/settings/company");
  } catch (error) {
    console.error("[settingsApi.getCompanySettings] Error fetching company settings:", error.message);
    throw error;
  }
};

export const updateCompanySettings = async (payload) => {
  try {
    return await api.put("/settings/company", payload);
  } catch (error) {
    console.error("[settingsApi.updateCompanySettings] Error updating company settings:", error.message, { payload });
    throw error;
  }
};

/** Live profile, subscription, and session details for the signed-in user. */
export const getAccountOverview = async () => {
  try {
    return await api.get("/settings/account-overview");
  } catch (error) {
    console.error("[settingsApi.getAccountOverview] Error fetching account overview:", error.message);
    throw error;
  }
};

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

/** Current subscription + trial flags + embedded plan catalog. */
export const getSubscription = async () => {
  try {
    const res = await api.get("/settings/subscription");
    return { ...res, data: unwrap(res) };
  } catch (error) {
    console.error("[settingsApi.getSubscription] Error fetching subscription:", error.message);
    throw error;
  }
};

export const getSubscriptionPlans = async () => {
  try {
    const res = await api.get("/settings/subscription/plans");
    return { ...res, data: unwrap(res) };
  } catch (error) {
    console.error("[settingsApi.getSubscriptionPlans] Error fetching subscription plans:", error.message);
    throw error;
  }
};

export const getSubscriptionPlan = async (planId) => {
  try {
    const res = await api.get(`/settings/subscription/plans/${planId}`);
    return { ...res, data: unwrap(res) };
  } catch (error) {
    console.error("[settingsApi.getSubscriptionPlan] Error fetching subscription plan:", error.message, { planId });
    throw error;
  }
};

export const activateTrial = async () => {
  try {
    const res = await api.post("/settings/subscription/activate-trial");
    return {
      ...res,
      data: unwrap(res),
      message: res?.data?.message,
    };
  } catch (error) {
    console.error("[settingsApi.activateTrial] Error activating trial:", error.message);
    throw error;
  }
};

export const contactSales = async (payload = {}) => {
  try {
    const res = await api.post("/settings/subscription/contact-sales", payload);
    return {
      ...res,
      data: unwrap(res),
      message: res?.data?.message,
    };
  } catch (error) {
    console.error("[settingsApi.contactSales] Error sending sales contact request:", error.message, { payload });
    throw error;
  }
};
