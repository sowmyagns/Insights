import { getProducts } from "../api/productsApi";
import { enrichApiProduct } from "../data/productsMasterData";
import { asArray } from "./apiError";
import { cleanProductLabel, isFinishedGoodProduct } from "./productLabel";

export { cleanProductLabel, isFinishedGoodProduct } from "./productLabel";

/** Load products from API and local storage (smrt_products). */
export async function fetchProductsWithFallback() {
  try {
    const res = await getProducts();
    const apiProds = asArray(res?.data);
    if (apiProds.length) {
      return apiProds.map((p, i) => {
        const enriched = enrichApiProduct(p, i);
        return { ...enriched, name: cleanProductLabel(enriched.name) };
      });
    }
  } catch {
    /* fall through to local cache */
  }
  try {
    const stored = localStorage.getItem("smrt_products");
    const localProds = stored ? JSON.parse(stored) : [];
    return asArray(localProds).map((p, i) => {
      const enriched = enrichApiProduct(p, i);
      return { ...enriched, name: cleanProductLabel(enriched.name) };
    });
  } catch {
    return [];
  }
}

/** Finished goods only — for Production Order / Work Order product selects. */
export async function fetchFinishedGoodsWithFallback() {
  const all = await fetchProductsWithFallback();
  return all.filter(isFinishedGoodProduct);
}
