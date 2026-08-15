import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import Button from "../common/Button";
import { ACCOUNT_GROUPS, EXPENSE_COLOURS } from "../../data/expenseCategories";

export default function ExpenseCategoryModal({
  open,
  onClose,
  onSave,
  onDelete,
  category = null,
}) {
  const isEdit = Boolean(category?.id);
  const [name, setName] = useState("");
  const [accountGroup, setAccountGroup] = useState("");
  const [color, setColor] = useState(EXPENSE_COLOURS[0].value);

  useEffect(() => {
    if (!open) return;
    setName(category?.name || "");
    setAccountGroup(category?.account_group || "");
    setColor(category?.color || EXPENSE_COLOURS[0].value);
  }, [open, category]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave?.({
      id: category?.id || `cat-${Date.now()}`,
      name: name.trim(),
      account_group: accountGroup || "Indirect Expense",
      color,
      icon: category?.icon || "grid",
    });
    onClose?.();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-[18px] font-bold text-[#1a1a1f]">
            {isEdit ? "Edit Category" : "Add Category"}
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#6b6b76] hover:bg-[#f5f5f7]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <label className="block">
            <span className="text-[12px] text-[#6b6b76]">Category Name</span>
            <input
              className="mt-1 w-full border-0 border-b border-[#d0d0d8] bg-transparent py-2 text-[14px] outline-none placeholder:text-[#9a9aa5] focus:border-[#2d2a4a]"
              placeholder="Category"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-[12px] text-[#6b6b76]">Account group</span>
            <select
              className="mt-1 w-full border-0 border-b border-[#d0d0d8] bg-transparent py-2 text-[14px] outline-none focus:border-[#2d2a4a]"
              value={accountGroup}
              onChange={(e) => setAccountGroup(e.target.value)}
            >
              <option value="">Select</option>
              {ACCOUNT_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-3 text-[12px] text-[#6b6b76]">Select Colour</p>
            <div className="flex items-center gap-3">
              {EXPENSE_COLOURS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`h-8 w-8 rounded-full ${
                    color === c.value ? "ring-2 ring-[#1a1a1f] ring-offset-2" : ""
                  }`}
                  style={{ background: c.value }}
                  aria-label={c.id}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#ececf0] px-5 py-4">
          {isEdit ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                onDelete?.(category);
                onClose?.();
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
}
