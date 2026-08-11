import { useEffect, useState } from "react";
import { getFeatureSetting, putFeatureSetting } from "../../api/bizDocumentsApi";
import { useToast } from "../../context/ToastContext";
import Loader from "../../components/common/Loader";
import { apiErrorMessage } from "../../utils/apiError";

const PAGE_BG = "#F4F7FE";
const SETTING_KEY = "inventory_settings";

const DEFAULTS = {
  stock_value_tax: "exclusive",
  price_setting: "last_sale_purchase",
  stock_value_basis: "purchase",
  track_from: "invoice",
  stock_warning: "no",
  wholesale_price: false,
  scan_barcode: false,
  secondary_units: false,
  item_description: true,
  mrp: false,
  cess: true,
  show_category: true,
  inventory_module: "latest",
};

function Radio({ name, value, checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="radio"
        name={name}
        className="mt-1 accent-[#0f6d84]"
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span>
        <span className="block text-[13px] font-semibold text-[#1a1a1f]">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12px] leading-snug text-[#6b6b76]">{hint}</span> : null}
      </span>
    </label>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="rounded-xl bg-teal-50 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-[#0f6d84]">
      {children}
    </div>
  );
}

function ToggleRow({ label, on, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-teal-50 px-4 py-3">
      <span className="text-[13px] font-bold text-[#0f6d84]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          on ? "bg-[#0f6d84]" : "bg-[#c8c8d0]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            on ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function InventorySettingsV2() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("basic");
  const [form, setForm] = useState(DEFAULTS);

  useEffect(() => {
    getFeatureSetting(SETTING_KEY)
      .then((r) => {
        const v = r.data?.value;
        if (v && typeof v === "object") setForm({ ...DEFAULTS, ...v });
      })
      .catch(() => setForm(DEFAULTS))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    setSaving(true);
    try {
      await putFeatureSetting(SETTING_KEY, form);
      addToast("Inventory settings saved.");
    } catch (err) {
      addToast(apiErrorMessage(err, "Save failed"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" style={{ background: PAGE_BG }}>
        <Loader label="Loading inventory settings…" />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>

      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="overflow-hidden rounded-2xl border border-[#e4e4ea] bg-white">
          <div className="relative flex border-b border-[#e4e4ea]">
            {[
              { id: "basic", label: "Basic Details" },
              { id: "optional", label: "Optional Details" },
            ].map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`relative z-[1] flex-1 px-4 py-3.5 text-sm font-bold transition-colors duration-300 ${
                    active ? "text-[#1a1a1f]" : "text-[#9a9aa5] hover:text-[#6b6b76]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-1/2 rounded-full bg-[#0f6d84] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ transform: tab === "optional" ? "translateX(100%)" : "translateX(0)" }}
            />
          </div>

          <div className="overflow-hidden">
            <div
              className="flex w-[200%] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ transform: tab === "optional" ? "translateX(-50%)" : "translateX(0)" }}
            >
              <div className="w-1/2 shrink-0 space-y-5 p-5">
                <div className="space-y-3">
                  <SectionTitle>Stock Value</SectionTitle>
                  <div className="space-y-3 px-1">
                    <Radio
                      name="stock_value_tax"
                      value="exclusive"
                      checked={form.stock_value_tax === "exclusive"}
                      onChange={(v) => set("stock_value_tax", v)}
                      label="Gst Exclusive"
                    />
                    <Radio
                      name="stock_value_tax"
                      value="inclusive"
                      checked={form.stock_value_tax === "inclusive"}
                      onChange={(v) => set("stock_value_tax", v)}
                      label="Gst Inclusive"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionTitle>Sale / Purchase Price Setting</SectionTitle>
                  <div className="space-y-3 px-1">
                    <Radio
                      name="price_setting"
                      value="party_wise"
                      checked={form.price_setting === "party_wise"}
                      onChange={(v) => set("price_setting", v)}
                      label="Maintain party wise price"
                    />
                    <Radio
                      name="price_setting"
                      value="last_sale_purchase"
                      checked={form.price_setting === "last_sale_purchase"}
                      onChange={(v) => set("price_setting", v)}
                      label="Pickup price from last sale or purchase"
                    />
                    <Radio
                      name="price_setting"
                      value="fixed"
                      checked={form.price_setting === "fixed"}
                      onChange={(v) => set("price_setting", v)}
                      label="Show the rate I entered in product detail (Fixed price)"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionTitle>Calculation of Stock Value</SectionTitle>
                  <div className="space-y-3 px-1">
                    <Radio
                      name="stock_value_basis"
                      value="purchase"
                      checked={form.stock_value_basis === "purchase"}
                      onChange={(v) => set("stock_value_basis", v)}
                      label="On Purchase Price"
                    />
                    <Radio
                      name="stock_value_basis"
                      value="sale"
                      checked={form.stock_value_basis === "sale"}
                      onChange={(v) => set("stock_value_basis", v)}
                      label="On Sale Price"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionTitle>Sales Inventory Setting</SectionTitle>
                  <div className="space-y-4 px-1">
                    <div>
                      <p className="mb-2 text-[12px] font-semibold text-[#6b6b76]">
                        How do you want to track the inventory?
                      </p>
                      <div className="space-y-3">
                        <Radio
                          name="track_from"
                          value="invoice"
                          checked={form.track_from === "invoice"}
                          onChange={(v) => set("track_from", v)}
                          label="Track from Invoice"
                        />
                        <Radio
                          name="track_from"
                          value="delivery_challan"
                          checked={form.track_from === "delivery_challan"}
                          onChange={(v) => set("track_from", v)}
                          label="Track from Delivery Challan"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[12px] font-semibold text-[#6b6b76]">
                        Show Stock Availability Warning
                      </p>
                      <div className="space-y-3">
                        <Radio
                          name="stock_warning"
                          value="yes"
                          checked={form.stock_warning === "yes"}
                          onChange={(v) => set("stock_warning", v)}
                          label="Yes"
                          hint="Warn when selling an item that is out of stock or below minimum stock."
                        />
                        <Radio
                          name="stock_warning"
                          value="no"
                          checked={form.stock_warning === "no"}
                          onChange={(v) => set("stock_warning", v)}
                          label="No"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-1/2 shrink-0 space-y-3 p-5">
                <p className="mb-1 text-[15px] font-bold text-[#1a1a1f]">Additional Details</p>
                <ToggleRow
                  label="Whole Sale Price"
                  on={form.wholesale_price}
                  onChange={(v) => set("wholesale_price", v)}
                />
                <ToggleRow label="Scan Barcode" on={form.scan_barcode} onChange={(v) => set("scan_barcode", v)} />
                <ToggleRow
                  label="Secondary Units"
                  on={form.secondary_units}
                  onChange={(v) => set("secondary_units", v)}
                />
                <ToggleRow
                  label="Item Description"
                  on={form.item_description}
                  onChange={(v) => set("item_description", v)}
                />
                <ToggleRow label="MRP" on={form.mrp} onChange={(v) => set("mrp", v)} />
                <ToggleRow label="CESS" on={form.cess} onChange={(v) => set("cess", v)} />
                <ToggleRow label="Show Category" on={form.show_category} onChange={(v) => set("show_category", v)} />

                <div className="space-y-3 pt-3">
                  <SectionTitle>Select Old Inventory Module</SectionTitle>
                  <div className="space-y-3 px-1">
                    <Radio
                      name="inventory_module"
                      value="old"
                      checked={form.inventory_module === "old"}
                      onChange={(v) => set("inventory_module", v)}
                      label="Use Old Inventory Module"
                    />
                    <Radio
                      name="inventory_module"
                      value="latest"
                      checked={form.inventory_module === "latest"}
                      onChange={(v) => set("inventory_module", v)}
                      label="Use Latest Inventory Module"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-[#e4e4ea] px-5 py-4">
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="rounded-lg bg-[#0f6d84] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
