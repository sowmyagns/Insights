import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import ExpenseCategoryModal from "../../components/accounts/ExpenseCategoryModal";
import {
  categoryIcon,
  fetchExpenseCategories,
  saveExpenseCategories,
} from "../../data/expenseCategories";
import { useToast } from "../../context/ToastContext";
import { apiErrorMessage } from "../../utils/apiError";

const PAGE_BG = "#F4F7FE";

export default function ExpenseSettingsV2() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchExpenseCategories();
        if (!cancelled) setCategories(rows);
      } catch (err) {
        if (!cancelled) {
          setCategories([]);
          addToast(apiErrorMessage(err, "Failed to load categories"), "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const persist = async (next) => {
    setCategories(next);
    try {
      await saveExpenseCategories(next);
    } catch (err) {
      addToast(apiErrorMessage(err, "Failed to save categories"), "error");
      const rows = await fetchExpenseCategories();
      setCategories(rows);
    }
  };

  const onSave = async (cat) => {
    const exists = categories.some((c) => c.id === cat.id);
    const next = exists
      ? categories.map((c) => (c.id === cat.id ? { ...c, ...cat } : c))
      : [...categories, cat];
    await persist(next);
    addToast(exists ? "Category updated." : "Category added.");
  };

  const onDelete = async (cat) => {
    if (!cat?.id) return;
    await persist(categories.filter((c) => c.id !== cat.id));
    addToast("Category deleted.");
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-[#6b6b76]" style={{ background: PAGE_BG }}>
        Loading categories…
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-[900px] px-4 py-5 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <Link
            to="/accounts/expenses"
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#e4e4ea] bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setEditCategory(null);
              setModalOpen(true);
            }}
            className="rounded-lg bg-[#0f6d84] px-4 py-2.5 text-[13px] font-semibold"
          >
            Add Category
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e4e4ea] bg-white">
          <ul className="divide-y divide-[#ececf0]">
            {categories.map((cat) => {
              const Icon = categoryIcon(cat.icon);
              return (
                <li key={cat.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-lg text-white"
                    style={{ background: cat.color || "#6b6b76" }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">{cat.name}</p>
                    <p className="text-[12px] text-[#6b6b76]">{cat.account_group}</p>
                  </div>
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[#6b4eff]"
                    onClick={() => {
                      setEditCategory(cat);
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[#dc2626]"
                    onClick={() => onDelete(cat)}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <ExpenseCategoryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditCategory(null);
        }}
        category={editCategory}
        onSave={onSave}
      />
    </div>
  );
}
