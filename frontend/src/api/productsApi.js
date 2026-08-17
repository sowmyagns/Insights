import api from "./axiosConfig";

function unwrap(res) {
  try {
    const body = res?.data;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      return { ...res, data: body.data };
    }
    return res;
  } catch (error) {
    console.error("[productsApi.unwrap] Error unwrapping response:", error.message);
    throw error;
  }
}

export const getProducts = async () => {
  try {
    return unwrap(await api.get("/api/masters/products"));
  } catch (error) {
    console.error("[productsApi.getProducts] Error fetching products:", error.message);
    throw error;
  }
};

export const getProductDetail = async (id) => {
  try {
    return unwrap(await api.get(`/api/masters/products/${id}`));
  } catch (error) {
    console.error("[productsApi.getProductDetail] Error fetching product detail:", error.message, { id });
    throw error;
  }
};

export const createProduct = async (payload) => {
  try {
    return unwrap(await api.post("/api/masters/products", payload));
  } catch (error) {
    console.error("[productsApi.createProduct] Error creating product:", error.message, { payload });
    throw error;
  }
};

export const updateProduct = async (id, payload) => {
  try {
    return unwrap(await api.put(`/api/masters/products/${id}`, payload));
  } catch (error) {
    console.error("[productsApi.updateProduct] Error updating product:", error.message, { id, payload });
    throw error;
  }
};

export const deleteProduct = async (id) => {
  try {
    return unwrap(await api.delete(`/api/masters/products/${id}`));
  } catch (error) {
    console.error("[productsApi.deleteProduct] Error deleting product:", error.message, { id });
    throw error;
  }
};
