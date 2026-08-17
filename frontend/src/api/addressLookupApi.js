import api from "./axiosConfig";
import { getPlatformToken } from "./platformApi";

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

/**
 * Shared PIN → address lookup (tenant settings or platform admin).
 * Uses the same backend Address Lookup Service.
 */
export async function lookupIndianPincode(pincode, { platform = false } = {}) {
  try {
    const pin = String(pincode || "").replace(/\D/g, "");
    const headers = {};
    if (platform) {
      const token = getPlatformToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const path = platform
      ? `/platform/address/pincode/${pin}`
      : `/settings/address/pincode/${pin}`;
    const res = await api.get(path, { headers, skipGlobalError: true });
    return unwrap(res);
  } catch (error) {
    console.error("[addressLookupApi.lookupIndianPincode] Error fetching address details:", error.message, { pincode });
    throw error;
  }
}
