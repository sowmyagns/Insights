import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, MapPin, MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";

import AddBasicDetailsModal from "./AddBasicDetailsModal";
import AddCustomFieldModal from "./AddCustomFieldModal";
import AddOtherDetailsModal from "./AddOtherDetailsModal";
import SearchableSelect from "../common/SearchableSelect";
import { createCustomer, getCustomers, updateCustomer } from "../../api/salesApi";
import {
  createMastersVendor,
  listMastersVendors,
  updateMastersVendor,
} from "../../api/mastersVendorsApi";
import { lookupIndianPincode } from "../../api/addressLookupApi";
import { INDIAN_STATES, CITIES_BY_STATE } from "../../data/indiaLocations";
import { useToast } from "../../context/ToastContext";
import useTenantId from "../../hooks/useTenantId";

const YELLOW = "var(--color-primary)";
const PURPLE = "#6b4eff";

const inputClass =
  "w-full rounded-lg border border-[#e4e4ea] bg-[#f3f3f6] px-3 py-2.5 text-[13px] text-[#1a1a1f] placeholder:text-[#a0a0ab] focus:border-[#c4b5fd] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#c4b5fd]";

const EMPTY = {
  gstin: "",
  name: "",
  phone: "",
};

const EMPTY_ADDRESS = {
  address_line1: "",
  pincode: "",
  city: "",
  state: "",
  country: "India",
};

const EMPTY_BASIC = {
  payment_terms_days: "",
  opening_balance: "",
  balance_type: "to_receive",
  email: "",
};

const EMPTY_OTHER = {
  party_type: "Buyer",
  gst_treatment: "",
  tax_preference: "Taxable",
  tds: false,
  tcs: false,
};

function SoftField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[#8a8a95]">
        {label}
        {required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function toInitial(party, variant = "customer") {
  if (!party) return null;
  const isVendor = variant === "vendor";
  return {
    form: {
      gstin: party.gstin || "",
      name: isVendor ? party.name || "" : party.company || party.name || "",
      phone: party.phone || "",
    },
    address: {
      address_line1: party.address_line1 || party.billing_address || "",
      pincode: party.pincode || "",
      city: party.city || "",
      state: party.state || "",
      country: party.country || "India",
    },
    basic: {
      ...EMPTY_BASIC,
      opening_balance:
        party.outstanding != null
          ? String(party.outstanding)
          : party.credit_limit != null
            ? String(party.credit_limit)
            : "",
      email: party.email || "",
    },
    other: {
      ...EMPTY_OTHER,
      party_type: isVendor ? "Seller" : "Buyer",
      gst_treatment: party.gstin ? "REGISTERED BUSINESS" : "",
    },
  };
}

function AddressModal({ open, onClose, initial, onSave }) {
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    if (!open) return;
    const initAddr = {
      ...EMPTY_ADDRESS,
      ...(initial || {}),
    };
    setAddress(initAddr);

    const stateCities = CITIES_BY_STATE[initAddr.state] || [];
    const initialCityList = [...new Set([...(initAddr.city ? [initAddr.city] : []), ...stateCities])];
    setCities(initialCityList);
  }, [open, initial]);

  useEffect(() => {
    if (!address.state) return;
    const stateCities = CITIES_BY_STATE[address.state] || [];
    setCities((prev) => [...new Set([...stateCities, ...prev])]);
  }, [address.state]);

  useEffect(() => {
    if (!open) return;
    const pin = String(address.pincode || "").replace(/\D/g, "");
    if (pin.length !== 6) return;
    let cancelled = false;
    lookupIndianPincode(pin)
      .then((data) => {
        if (cancelled || !data) return;
        const opts = [];
        if (data.city) opts.push(data.city);
        if (data.district && data.district !== data.city) opts.push(data.district);
        if (data.post_office) opts.push(data.post_office);
        const stateCities = CITIES_BY_STATE[data.state] || [];
        setCities([...new Set([...opts, ...stateCities].filter(Boolean))]);
        setAddress((prev) => ({
          ...prev,
          city: data.city || data.district || prev.city,
          state: data.state || prev.state,
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address.pincode, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      role="presentation"
    >
      <div
        className="w-full max-w-[680px] rounded-xl border border-[#d0d0d8] bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4">
          <h3 className="text-[30px] font-bold text-[#1a1a1f]">Add Billing Address</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#6b6b76] hover:bg-[#f2f2f4]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <SoftField label="Address">
            <input
              value={address.address_line1}
              onChange={(e) => setAddress((p) => ({ ...p, address_line1: e.target.value }))}
              placeholder="Enter Address"
              className={inputClass}
            />
          </SoftField>
          <div className="grid grid-cols-2 gap-3">
            <SoftField label="Pincode">
              <input
                value={address.pincode}
                onChange={(e) =>
                  setAddress((p) => ({
                    ...p,
                    pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                placeholder="Enter valid Pincode"
                className={inputClass}
              />
            </SoftField>
            <SoftField label="City">
              <input
                list="party-address-city-list"
                value={address.city}
                onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))}
                placeholder="Enter or select City"
                className={inputClass}
              />
              <datalist id="party-address-city-list">
                {cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </SoftField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SoftField label="State">
              <SearchableSelect
                value={address.state}
                onChange={(v) => {
                  setAddress((p) => {
                    const stateCities = CITIES_BY_STATE[v] || [];
                    const defaultCity = p.city && stateCities.includes(p.city) ? p.city : (stateCities[0] || p.city);
                    return { ...p, state: v, city: defaultCity };
                  });
                }}
                options={INDIAN_STATES}
                placeholder="Select State"
                className="!rounded-lg !border-[#d0d0d8] !bg-[#f3f3f6] !py-2.5 !text-[13px] !shadow-none"
              />
            </SoftField>
            <SoftField label="Country">
              <select
                value={address.country}
                onChange={(e) => setAddress((p) => ({ ...p, country: e.target.value }))}
                className={inputClass}
              >
                <option value="India">Select Country</option>
                <option value="India">India</option>
              </select>
            </SoftField>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-[#ececf0] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#eff0f4] py-2.5 text-[14px] font-semibold text-[#1a1a1f]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave?.(address);
              onClose?.();
            }}
            className="rounded-lg py-2.5 text-[14px] font-semibold text-white"
            style={{ background: YELLOW }}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AddNewPartyModal({
  open,
  onClose,
  onSaved,
  customer = null,
  vendor = null,
  variant = "customer",
  title = null,
}) {
  const tenantId = useTenantId();
  const { addToast } = useToast();
  const party = variant === "vendor" ? vendor : customer;
  const isVendor = variant === "vendor";
  const [form, setForm] = useState(EMPTY);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [addressOpen, setAddressOpen] = useState(false);
  const [basicDetails, setBasicDetails] = useState(null);
  const [basicOpen, setBasicOpen] = useState(false);
  const [otherDetails, setOtherDetails] = useState(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [customFields, setCustomFields] = useState([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingParties, setExistingParties] = useState([]);

  const isEdit = Boolean(party);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    if (isVendor) {
      listMastersVendors()
        .then((res) => {
          if (mounted && Array.isArray(res?.data)) setExistingParties(res.data);
        })
        .catch(() => {});
    } else {
      getCustomers()
        .then((res) => {
          if (mounted && Array.isArray(res?.data)) setExistingParties(res.data);
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [open, isVendor]);

  useEffect(() => {
    if (!open) return;
    const init = toInitial(party, variant);
    if (!init) {
      setForm(EMPTY);
      setAddress(EMPTY_ADDRESS);
      setBasicDetails(null);
      setOtherDetails(null);
      setCustomFields([]);
      return;
    }
    setForm(init.form);
    setAddress(init.address);
    setBasicDetails(init.basic);
    setOtherDetails(init.other);
    setCustomFields([]);
  }, [open, party, variant]);

  const addressText = useMemo(() => {
    return [address.address_line1, address.city, address.state, address.pincode]
      .filter(Boolean)
      .join(", ");
  }, [address]);

  if (!open) return null;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      addToast("Company Name is required", "error");
      return;
    }
    if (!/[a-zA-Z]/.test(form.name)) {
      addToast("Company Name must contain at least one letter", "error");
      return;
    }
    const phoneVal = form.phone.trim();
    if (phoneVal) {
      if (/\D/.test(phoneVal)) {
        addToast("Mobile No. must contain only numeric digits (0-9)", "error");
        return;
      }
      if (phoneVal.length !== 10) {
        addToast("Mobile No. must be exactly 10 digits", "error");
        return;
      }
    }
    const gstinVal = form.gstin ? form.gstin.trim().toUpperCase() : "";
    if (gstinVal) {
      // Only block on duplicate GSTIN
      const dup = existingParties.find(
        (p) =>
          String(p.id) !== String(party?.id) &&
          p.gstin &&
          p.gstin.trim().toUpperCase() === gstinVal
      );
      if (dup) {
        addToast(
          `A ${isVendor ? "vendor" : "customer"} with GSTIN "${gstinVal}" already exists.`,
          "error"
        );
        return;
      }
    }
    if (isVendor) {
      const email = basicDetails?.email?.trim() || party?.email || "";
      if (!phoneVal) {
        addToast("Mobile No. is required for vendors", "error");
        return;
      }
      if (!email) {
        addToast("Add email in Basic Details for vendors", "error");
        return;
      }
    }
    setSaving(true);
    try {
      const extraNotes = [
        basicDetails?.payment_terms_days
          ? `Payment Terms: ${basicDetails.payment_terms_days} Days`
          : "",
        basicDetails?.balance_type
          ? `Balance: ${basicDetails.balance_type === "to_pay" ? "To Pay" : "To Receive"}`
          : "",
        otherDetails?.party_type ? `Party type: ${otherDetails.party_type}` : "",
        otherDetails?.gst_treatment ? `GST Treatment: ${otherDetails.gst_treatment}` : "",
        ...customFields.map((f) => `${f.label}: ${f.value}`),
      ]
        .filter(Boolean)
        .join(" | ");

      const opening = basicDetails?.opening_balance
        ? Number(basicDetails.opening_balance)
        : Number(party?.outstanding || 0);

      if (isVendor) {
        const email = basicDetails?.email?.trim() || party?.email || "";
        const vendorPayload = {
          tenant_id: tenantId,
          name: form.name.trim(),
          contact: form.name.trim(),
          gstin: form.gstin.trim() || null,
          phone: form.phone.trim(),
          email,
          address_line1: address.address_line1 || null,
          address_line2:
            [address.city, address.state, address.pincode, extraNotes].filter(Boolean).join(", ") ||
            null,
          city: address.city || null,
          state: address.state || null,
          pincode: address.pincode || null,
          country: address.country || "India",
          vendor_type: "Raw Material Supplier",
          status: "active",
          credit_limit: Number(party?.credit_limit || 0),
        };
        let response = null;
        if (isEdit && typeof party?.id === "number") {
          response = await updateMastersVendor(party.id, vendorPayload);
          addToast("Vendor updated");
        } else {
          response = await createMastersVendor(vendorPayload);
          addToast("Vendor added successfully");
        }
        onSaved?.(response?.data || vendorPayload, { isEdit, vendor: party });
        onClose?.();
        return;
      }

      const payload = {
        tenant_id: tenantId,
        name: form.name.trim(),
        gstin: form.gstin.trim() || null,
        phone: form.phone.trim() || null,
        email: basicDetails?.email?.trim() || party?.email || null,
        address_line1: address.address_line1 || null,
        address_line2:
          [address.city, address.state, address.pincode, extraNotes].filter(Boolean).join(", ") ||
          null,
        city: address.city || null,
        pincode: address.pincode || null,
        state: address.state || null,
        credit_limit: Number(party?.credit_limit || 0),
        outstanding: Number.isFinite(opening) ? opening : 0,
        status: "active",
      };

      let response = null;
      if (isEdit && typeof party?.id === "number") {
        response = await updateCustomer(party.id, payload);
        addToast("Customer updated");
      } else {
        response = await createCustomer(payload);
        addToast("Buyer added successfully");
      }
      onSaved?.(response?.data || payload, { isEdit, customer: party });
      onClose?.();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to save customer", "error");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form
        onSubmit={onSubmit}
        className="flex max-h-[92vh] w-full max-w-[690px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-6 py-4">
          <h2 className="text-xl font-bold text-[#1a1a1f] sm:text-2xl">
            {title || (isEdit ? (isVendor ? "Edit Vendor" : "Edit Customer") : (isVendor ? "Add Vendor" : "Add Customer"))}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#1a1a1f] hover:bg-[#f5f5f7]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3.5">
            <SoftField label="GSTIN">
              <div className="relative">
                <input
                  value={form.gstin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gstin: e.target.value }))
                  }
                  placeholder="Enter GSTIN"
                  className={inputClass}
                />
                {isEdit && form.gstin ? (
                  <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6b76]" />
                ) : null}
              </div>
            </SoftField>

            <div className="grid grid-cols-2 gap-3">
              <SoftField label="Company Name" required>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Enter Company Name"
                  required
                  className={inputClass}
                />
              </SoftField>
              <SoftField label="Mobile No.">
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  placeholder="Enter Mobile No."
                  className={inputClass}
                />
              </SoftField>
            </div>

            <div className="rounded-lg border border-[#e4e4ea] bg-[#fafafa] px-4 py-3.5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1a1a1f]">
                  <MapPin className="h-4 w-4 text-[#6b4eff]" />
                  Billing Address
                </div>
                {addressText ? (
                  <button
                    type="button"
                    onClick={() => setAddressOpen(true)}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[#6b4eff] hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                ) : null}
              </div>
              <div className="space-y-2.5">
                <input
                  value={address.address_line1}
                  onChange={(e) => setAddress((p) => ({ ...p, address_line1: e.target.value }))}
                  placeholder="Street / Address Line"
                  className={inputClass}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={address.pincode}
                    onChange={(e) =>
                      setAddress((p) => ({
                        ...p,
                        pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    placeholder="Pincode"
                    className={inputClass}
                  />
                  <input
                    value={address.city}
                    onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                    className={inputClass}
                  />
                </div>
                <select
                  value={address.state}
                  onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-[#ececf0] pt-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#1a1a1f]">Basic Details</p>
                <p className="truncate text-[12px] text-[#6b6b76]">
                  Opening Balance, Payment Terms, Credit Limit
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBasicOpen(true)}
                className="ui-btn-secondary inline-flex shrink-0 items-center gap-1 !py-1.5 !text-[12px]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </div>

          <div className="mt-2 border-t border-[#ececf0] pt-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#1a1a1f]">Other Details</p>
                <p className="truncate text-[12px] text-[#6b6b76]">Tax Settings, TDS / TCS , Party type</p>
              </div>
              <button
                type="button"
                onClick={() => setOtherOpen(true)}
                className="ui-btn-secondary inline-flex shrink-0 items-center gap-1 !py-1.5 !text-[12px]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </div>

          <div className="mt-2 border-t border-[#ececf0] pt-3.5">
            {customFields.map((field) => (
              <div
                key={field.id}
                className="mb-2 flex items-start justify-between gap-3 rounded-lg border border-[#e8e8ee] bg-[#fafafa] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#1a1a1f]">{field.label}</p>
                  {field.value ? (
                    <p className="mt-0.5 truncate text-[12px] text-[#6b6b76]">{field.value}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setCustomFields((rows) => rows.filter((x) => x.id !== field.id))}
                  className="rounded p-1 text-[#9a9aa5] hover:bg-[#f0f0f4] hover:text-[#e11d48]"
                  aria-label={`Remove ${field.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#9aa5ff] bg-white px-3 py-2 text-[13px] font-semibold"
              style={{ color: PURPLE }}
            >
              <Plus className="h-4 w-4" />
              Add Custom Field
            </button>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-4 border-t border-[#ececf0] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-secondary py-3 text-[14px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="ui-btn-primary py-3 text-[14px] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </form>

      <AddressModal
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        initial={address}
        onSave={setAddress}
      />
      <AddBasicDetailsModal
        open={basicOpen}
        onClose={() => setBasicOpen(false)}
        initial={basicDetails || EMPTY_BASIC}
        onSave={setBasicDetails}
      />
      <AddOtherDetailsModal
        open={otherOpen}
        onClose={() => setOtherOpen(false)}
        initial={otherDetails || EMPTY_OTHER}
        onSave={setOtherDetails}
      />
      <AddCustomFieldModal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onSave={(field) => setCustomFields((rows) => [...rows, field])}
      />
    </div>,
    document.body
  );
}
