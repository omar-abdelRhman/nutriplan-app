import { CONFIG } from "../config.js";
import { Normalizer } from "../utils/normalize.js";

/**
 * NutriPlanAPI
 * One class for every endpoint of https://nutriplan-api.vercel.app/api
 *  - Meals     (TheMealDB)
 *  - Nutrition (USDA, needs x-api-key)
 *  - Products  (OpenFoodFacts)
 *
 * Endpoints whose exact query-param/path name is not 100% certain use `#firstOk`,
 * which tries the known variants in order. If the Swagger shows a different name,
 * change it in ONE place here.
 */
export class NutriPlanAPI {
  constructor(baseUrl = CONFIG.BASE_URL, usdaKey = CONFIG.USDA_API_KEY) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.usdaKey = usdaKey;
  }

  /* ---------------- core ---------------- */

  async #request(path, { params = {}, method = "GET", body, headers = {} } = {}) {
    const url = new URL(this.baseUrl + path);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });

    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const err = await res.json();
        detail = err.message || err.error || "";
      } catch {
        /* ignore */
      }
      const error = new Error(detail || `Request failed (${res.status})`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  }

  /** Try each attempt in order; return the first one that gives a non-empty result. */
  async #firstOk(attempts, isEmpty = (r) => !r || (Array.isArray(r) && r.length === 0)) {
    let lastError;
    let anySucceeded = false;
    for (const attempt of attempts) {
      try {
        const result = await attempt();
        anySucceeded = true;
        if (!isEmpty(result)) return result;
      } catch (err) {
        lastError = err;
      }
    }
    if (!anySucceeded && lastError) throw lastError;
    return null;
  }

  /* ---------------- meals ---------------- */

  async getCategories() {
    const json = await this.#request("/meals/categories");
    return Normalizer.list(json).map(Normalizer.category).filter((c) => c.name);
  }

  async getAreas() {
    try {
      const json = await this.#request("/meals/areas");
      return Normalizer.list(json).map(Normalizer.area).filter(Boolean);
    } catch {
      return [];
    }
  }

  async searchMeals(q, { page = 1, limit = CONFIG.MEALS_LIMIT } = {}) {
    const json = await this.#request("/meals/search", { params: { q, page, limit } });
    return Normalizer.list(json).map(Normalizer.meal);
  }

  /** First screen: 25 meals. Falls back to other endpoints if the first returns nothing. */
  async getInitialMeals(limit = CONFIG.MEALS_LIMIT) {
    const list = await this.#firstOk([
      async () => (await this.searchMeals("", { limit })).slice(0, limit),
      async () => {
        const json = await this.#request("/meals/random", { params: { count: limit } });
        return Normalizer.list(json).map(Normalizer.meal);
      },
      async () => (await this.searchMeals("chicken", { limit })).slice(0, limit),
    ]);
    return list || [];
  }

  /** Filter by category OR area (the endpoint returns full details). */
  async filterMeals({ category, area, limit = CONFIG.MEALS_LIMIT }) {
    const variants = category
      ? [{ category }, { c: category }]
      : [{ area }, { a: area }];

    const json = await this.#firstOk(
      variants.map((params) => () => this.#request("/meals/filter", { params: { ...params, limit } })),
      (r) => Normalizer.list(r).length === 0
    );
    return Normalizer.list(json).map(Normalizer.meal);
  }

  async getMeal(id) {
    const json = await this.#request(`/meals/${encodeURIComponent(id)}`);
    return Normalizer.meal(Normalizer.one(json));
  }

  /* ---------------- nutrition (USDA) ---------------- */

  async analyzeNutrition(recipeName, ingredients) {
    if (!this.usdaKey || this.usdaKey.startsWith("PUT_")) {
      const err = new Error("Add your USDA API key in src/js/config.js");
      err.code = "NO_KEY";
      throw err;
    }
    const json = await this.#request("/nutrition/analyze", {
      method: "POST",
      headers: { "x-api-key": this.usdaKey },
      body: { recipeName, ingredients },
    });
    console.log("[NutriPlan] nutrition response:", json);
    return Normalizer.nutrition(json, CONFIG.DEFAULT_SERVINGS);
  }

  /* ---------------- products (OpenFoodFacts) ---------------- */

  async searchProducts(q, { page = 1, limit = CONFIG.PRODUCTS_LIMIT } = {}) {
    const json = await this.#request("/products/search", { params: { q, page, limit } });
    return Normalizer.list(json).map(Normalizer.product);
  }

  async getProductByBarcode(barcode) {
    const json = await this.#firstOk([
      () => this.#request(`/products/barcode/${encodeURIComponent(barcode)}`),
    ], (r) => !r);
    const raw = Normalizer.one(json);
    return raw && typeof raw === "object" && Object.keys(raw).length ? Normalizer.product(raw) : null;
  }

  async getProductCategories() {
    try {
      const json = await this.#request("/products/categories");
      return Normalizer.list(json).map(Normalizer.category).filter((c) => c.name);
    } catch {
      return [];
    }
  }

  async getProductsByCategory(category, { page = 1, limit = CONFIG.PRODUCTS_LIMIT } = {}) {
    const name = encodeURIComponent(category);
    const json = await this.#firstOk(
      [
        () => this.#request(`/products/category/${name}`, { params: { page, limit } }),
        () => this.#request(`/products/categories/${name}`, { params: { page, limit } }),
      ],
      (r) => Normalizer.list(r).length === 0
    );
    return Normalizer.list(json).map(Normalizer.product);
  }
}
