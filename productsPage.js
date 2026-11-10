import { $, $$ } from "../utils/helpers.js";
import { UI } from "../ui/components.js";
import { CONFIG } from "../config.js";

const GRADE_ACTIVE = ["ring-2", "ring-gray-900"];
const STATIC_CATEGORY_MAP = {
  snacks: "snacks",
  beverages: "beverages",
  breakfast: "breakfast cereals",
  desserts: "desserts",
  dairy: "dairy",
};

/** Product Scanner: search by name, lookup by barcode, browse categories, filter by Nutri-Score. */
export class ProductsPage {
  constructor({ api, state, store, router }) {
    this.api = api;
    this.state = state;
    this.store = store;
    this.router = router;
    this.requestId = 0;
    this.lastAction = null;
  }

  init() {
    this.grid = $("#products-grid");
    this.count = $("#products-count");
    this.nameInput = $("#product-search-input");
    this.barcodeInput = $("#barcode-input");
    this.categoryBar = $("#product-categories");

    this.grid.innerHTML = UI.empty("No products to display", "Search for a product or browse by category", "fa-box-open");
    this.count.textContent = "Search for products to see results";

    $("#search-product-btn").addEventListener("click", () => this.searchByName());
    this.nameInput.addEventListener("keydown", (e) => e.key === "Enter" && this.searchByName());

    $("#lookup-barcode-btn").addEventListener("click", () => this.lookupBarcode());
    this.barcodeInput.addEventListener("keydown", (e) => e.key === "Enter" && this.lookupBarcode());

    $$(".nutri-score-filter").forEach((btn) =>
      btn.addEventListener("click", () => this.setGrade(btn.dataset.grade || ""))
    );

    this.categoryBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".product-category-btn");
      if (btn) this.loadCategory(btn.dataset.category);
    });

    this.grid.addEventListener("click", (e) => {
      if (e.target.closest("[data-retry]")) return this.lastAction?.();
      const logBtn = e.target.closest(".log-product-btn");
      if (logBtn) this.logProduct(logBtn.closest(".product-card").dataset.barcode);
    });
  }

  /** Same categories as the reference design; each button maps to the matching API category if one exists. */
  async loadCategories() {
    const fixed = [
      { name: "Breakfast Cereals", re: /cereal/i },
      { name: "Beverages", re: /beverage/i },
      { name: "Snacks", re: /^snacks?$/i },
      { name: "Dairy Products", re: /dairy/i },
      { name: "Fruits", re: /^fruits?$/i },
      { name: "Vegetables", re: /^vegetables?$/i },
      { name: "Breads", re: /bread/i },
      { name: "Meats", re: /meat/i },
    ];
    const api = await this.api.getProductCategories();
    const buttons = fixed.map((f) => ({ name: f.name, value: api.find((c) => f.re.test(c.name))?.name || f.name }));
    this.categoryBar.innerHTML = UI.productCategoryButtons(buttons);
  }

  show() {
    /* nothing to refresh: results stay as the user left them */
  }

  /* ---------- actions ---------- */

  async #run(action, loadingText) {
    const id = ++this.requestId;
    this.lastAction = action;
    this.grid.innerHTML = UI.spinner(loadingText);
    this.count.textContent = "Loading...";
    try {
      const products = await action();
      if (id !== this.requestId) return;
      this.state.products = products;
      this.render();
    } catch (err) {
      if (id !== this.requestId) return;
      console.error(err);
      this.state.products = [];
      this.count.textContent = "Something went wrong";
      this.grid.innerHTML = UI.error(
        err.status === 404 ? "Nothing found for that." : "Could not load products. Check your connection.",
        err.status === 404 ? "" : "data-retry"
      );
    }
  }

  async searchByName() {
    const q = this.nameInput.value.trim();
    if (!q) return UI.toast("warning", "Type a product name first");
    this.#clearActiveCategory();
    await this.#run(() => this.api.searchProducts(q), "Searching products...");
  }

  async lookupBarcode() {
    const code = this.barcodeInput.value.trim();
    if (!/^\d{6,14}$/.test(code)) return UI.toast("warning", "Enter a valid barcode (digits only)");
    this.#clearActiveCategory();
    await this.#run(async () => {
      const product = await this.api.getProductByBarcode(code);
      return product ? [product] : [];
    }, "Looking up barcode...");
  }

  async loadCategory(category) {
    $$(".product-category-btn", this.categoryBar).forEach((b) =>
      b.classList.toggle("ring-2", b.dataset.category === category)
    );
    $$(".product-category-btn", this.categoryBar).forEach((b) =>
      b.classList.toggle("ring-gray-900", b.dataset.category === category)
    );
    await this.#run(() => this.api.getProductsByCategory(category), `Loading ${category}...`);
  }

  #clearActiveCategory() {
    $$(".product-category-btn", this.categoryBar).forEach((b) => b.classList.remove(...GRADE_ACTIVE));
  }

  setGrade(grade) {
    this.state.productGrade = grade;
    $$(".nutri-score-filter").forEach((btn) => {
      const active = (btn.dataset.grade || "") === grade;
      if (!btn.dataset.grade) {
        btn.classList.toggle("bg-emerald-600", active);
        btn.classList.toggle("text-white", active);
        btn.classList.toggle("bg-gray-100", !active);
        btn.classList.toggle("text-gray-700", !active);
      } else {
        btn.classList.toggle("ring-2", active);
        btn.classList.toggle("ring-gray-900", active);
      }
    });
    if (this.state.products.length) this.render();
  }

  /* ---------- rendering ---------- */

  render() {
    const all = this.state.products;
    const grade = this.state.productGrade;
    const shown = grade ? all.filter((p) => p.nutriscore === grade) : all;

    this.count.textContent = grade
      ? `Showing ${shown.length} of ${all.length} products (Nutri-Score ${grade.toUpperCase()})`
      : `Found ${all.length} product${all.length === 1 ? "" : "s"}`;

    this.grid.innerHTML = shown.length
      ? shown.map(UI.productCard).join("")
      : UI.empty(
          all.length ? `No products with Nutri-Score ${grade.toUpperCase()}` : "No products found",
          all.length ? "Try another grade" : "Try a different name or barcode",
          "fa-box-open"
        );
  }

  /* ---------- logging ---------- */

  async logProduct(barcode) {
    const product = this.state.products.find((p) => p.barcode === barcode);
    if (!product) return;

    const servings = await UI.logModal({
      title: "Log This Product",
      name: product.name,
      image: product.image,
      nutrition: product.nutrition,
      note: " (100g)",
      confirmText: "Log Product",
    });
    if (!servings) return;

    const n = product.nutrition;
    this.store.add({
      type: "product",
      barcode: product.barcode,
      name: [product.brand, product.name].filter(Boolean).join(" - "),
      image: product.image,
      servings,
      calories: n.calories * servings,
      protein: n.protein * servings,
      carbs: n.carbs * servings,
      fat: n.fat * servings,
    });
    UI.loggedSuccess(product.name, servings, n.calories * servings, "product");
  }
}
