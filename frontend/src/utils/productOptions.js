import { getProducts } from "../api/productionApi";
import { enrichApiProduct } from "../data/productsMasterData";
import { cleanProductLabel, isFinishedGoodProduct } from "./productLabel";

export { cleanProductLabel, isFinishedGoodProduct } from "./productLabel";

/** Load products from API and local storage (smrt_products). */
export async function fetchProductsWithFallback() {
  try {
    const res = await getProducts().catch(() => null);
    if (res !== null) {
      const apiProds = Array.isArray(res) ? res : (res?.data || []);
      return apiProds.map((p, i) => {
        const enriched = enrichApiProduct(p, i);
        return { ...enriched, name: cleanProductLabel(enriched.name) };
      });
    }
    const stored = localStorage.getItem("smrt_products");
    const localProds = stored ? JSON.parse(stored) : [];
    return localProds.map((p, i) => {
      const enriched = enrichApiProduct(p, i);
      return { ...enriched, name: cleanProductLabel(enriched.name) };
    });
  } catch {
    const stored = localStorage.getItem("smrt_products");
    const localProds = stored ? JSON.parse(stored) : [];
    return localProds.map((p, i) => {
      const enriched = enrichApiProduct(p, i);
      return { ...enriched, name: cleanProductLabel(enriched.name) };
    });
  }
}

/** Finished goods only — for Production Order / Work Order product selects. */
export async function fetchFinishedGoodsWithFallback() {
  const all = await fetchProductsWithFallback();
  return all.filter(isFinishedGoodProduct);
}
