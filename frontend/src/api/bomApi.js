import api from "./axiosConfig";

function unwrap(res) {
  const body = res?.data;
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    return { ...res, data: body.data };
  }
  return res;
}

export const getAllBom = async () => {
  try {
    return unwrap(await api.get("/api/masters/bom"));
  } catch (error) {
    console.error("[bomApi.getAllBom] Error fetching all BOMs:", error.message);
    throw error;
  }
};

/** Alias used by BomMaster page */
export const getBillOfMaterials = getAllBom;

export const getProductBom = async (productId) => {
  try {
    if (!productId || typeof productId !== "number" || productId <= 0) {
      throw new Error("Invalid product ID");
    }
    return unwrap(await api.get(`/api/masters/bom/product/${productId}`));
  } catch (error) {
    console.error("[bomApi.getProductBom] Error fetching BOM for product:", error.message, { productId });
    throw error;
  }
};

export const addBomItem = async (productId, payload) => {
  try {
    if (!productId || typeof productId !== "number" || productId <= 0) {
      throw new Error("Invalid product ID");
    }
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid payload");
    }
    return unwrap(await api.post("/api/masters/bom", { ...payload, product_id: productId }));
  } catch (error) {
    console.error("[bomApi.addBomItem] Error adding BOM item:", error.message, { productId, payload });
    throw error;
  }
};

export const deleteBomItem = async (bomId) => {
  try {
    if (!bomId || typeof bomId !== "number" || bomId <= 0) {
      throw new Error("Invalid BOM ID");
    }
    return unwrap(await api.delete(`/api/masters/bom/${bomId}`));
  } catch (error) {
    console.error("[bomApi.deleteBomItem] Error deleting BOM item:", error.message, { bomId });
    throw error;
  }
};
