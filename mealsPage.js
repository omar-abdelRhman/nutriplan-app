import { $, debounce } from "../utils/helpers.js";
import { UI } from "../ui/components.js";
import { CONFIG } from "../config.js";

const FALLBACK_AREAS = [
  "American", "British", "Canadian", "Chinese", "Croatian", "Dutch", "Egyptian", "Filipino", "French", "Greek",
  "Indian", "Irish", "Italian", "Jamaican", "Japanese", "Kenyan", "Malaysian", "Mexican", "Moroccan", "Polish",
  "Portuguese", "Russian", "Spanish", "Thai", "Tunisian", "Turkish", "Ukrainian", "Vietnamese",
];

/** Home page: categories, area filter, search, recipes grid/list. */
export class MealsPage {
  constructor({ api, state, router }) {
    this.api = api;
    this.state = state;
    this.router = router;
    this.categories = [];
    this.areas = [];
    this.requestId = 0;
  }

  init() {
    this.grid = $("#recipes-grid");
    this.count = $("#recipes-count");
    this.categoriesGrid = $("#categories-grid");
    this.pillBar = $("#search-filters-section .overflow-x-auto");
    this.searchInput = $("#search-input");

    this.searchInput.addEventListener("input", debounce((e) => this.search(e.target.value.trim()), 450));

    this.categoriesGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".category-card");
      if (card) this.filterByCategory(card.dataset.category);
    });

    this.pillBar.addEventListener("click", (e) => {
      const pill = e.target.closest("[data-area]");
      if (pill) this.filterByArea(pill.dataset.area);
    });

    this.grid.addEventListener("click", (e) => {
      if (e.target.closest("[data-retry]")) return this.loadInitial();
      const card = e.target.closest(".recipe-card");
      if (card) this.router.navigate(`meal/${card.dataset.mealId}`);
    });

    $("#grid-view-btn").addEventListener("click", () => this.setView("grid"));
    $("#list-view-btn").addEventListener("click", () => this.setView("list"));
    $("#meal-categories-section button")?.addEventListener("click", () => this.loadInitial());
  }

  /** Categories + areas (loaded once at boot). */
  async loadStatic() {
    this.categoriesGrid.innerHTML = UI.spinner();
    const [cats, areas] = await Promise.allSettled([this.api.getCategories(), this.api.getAreas()]);

    this.categories = cats.status === "fulfilled" ? cats.value : [];
    this.areas = areas.status === "fulfilled" && areas.value.length ? areas.value : FALLBACK_AREAS;

    this.renderCategories();
    this.pillBar.innerHTML = UI.areaPills(this.areas, this.state.activeArea);
  }

  renderCategories() {
    this.categoriesGrid.innerHTML = this.categories.length
      ? this.categories.map((c, i) => UI.categoryCard(c, i, c.name === this.state.activeCategory)).join("")
      : UI.error("Could not load categories");
  }

  async show() {
    if (!this.state.meals.length) await this.loadInitial();
  }

  /* ---------- data loading ---------- */

  async #load(loader, label) {
    const id = ++this.requestId;
    this.grid.innerHTML = UI.spinner("Loading recipes...");
    try {
      const meals = await loader();
      if (id !== this.requestId) return; // a newer request replaced this one
      this.state.meals = meals;
      this.renderMeals(label);
    } catch (err) {
      if (id !== this.requestId) return;
      console.error(err);
      this.count.textContent = "Something went wrong";
      this.grid.innerHTML = UI.error("Could not load recipes. Check your connection.", "data-retry");
    }
  }

  async loadInitial() {
    this.state.activeCategory = "";
    this.state.activeArea = "";
    this.searchInput.value = "";
    this.renderCategories();
    this.pillBar.innerHTML = UI.areaPills(this.areas, "");
    await this.#load(() => this.api.getInitialMeals(CONFIG.MEALS_LIMIT), "");
  }

  async search(query) {
    if (!query) return this.loadInitial();
    this.state.activeCategory = "";
    this.state.activeArea = "";
    this.renderCategories();
    this.pillBar.innerHTML = UI.areaPills(this.areas, "");
    await this.#load(() => this.api.searchMeals(query), ` for "${query}"`);
  }

  async filterByCategory(name) {
    this.state.activeCategory = name;
    this.state.activeArea = "";
    this.searchInput.value = "";
    this.renderCategories();
    this.pillBar.innerHTML = UI.areaPills(this.areas, "");
    await this.#load(() => this.api.filterMeals({ category: name }), ` in ${name}`);
    $("#all-recipes-section").scrollIntoView({ behavior: "smooth" });
  }

  async filterByArea(area) {
    if (!area) return this.loadInitial();
    this.state.activeArea = area;
    this.state.activeCategory = "";
    this.searchInput.value = "";
    this.renderCategories();
    this.pillBar.innerHTML = UI.areaPills(this.areas, area);
    await this.#load(() => this.api.filterMeals({ area }), ` from ${area} cuisine`);
  }

  /* ---------- rendering ---------- */

  renderMeals(label = "") {
    const meals = this.state.meals;
    this.count.textContent = `Showing ${meals.length} recipe${meals.length === 1 ? "" : "s"}${label}`;
    this.grid.innerHTML = meals.length
      ? meals.map((m) => UI.recipeCard(m, this.state.viewMode === "list")).join("")
      : UI.empty("No recipes found", "Try searching for something else");
  }

  setView(mode) {
    this.state.viewMode = mode;
    const gridBtn = $("#grid-view-btn");
    const listBtn = $("#list-view-btn");
    const on = "px-3 py-1.5 bg-white rounded-md shadow-sm";
    const off = "px-3 py-1.5";
    gridBtn.className = mode === "grid" ? on : off;
    listBtn.className = mode === "list" ? on : off;
    gridBtn.querySelector("i").className = `fa-solid fa-table-cells ${mode === "grid" ? "text-gray-700" : "text-gray-500"}`;
    listBtn.querySelector("i").className = `fa-solid fa-list ${mode === "list" ? "text-gray-700" : "text-gray-500"}`;
    this.grid.className = mode === "grid" ? "grid grid-cols-4 gap-5" : "grid grid-cols-1 gap-5";
    if (this.state.meals.length) this.renderMeals(this.count.textContent.replace(/^Showing \d+ recipes?/, ""));
  }
}
