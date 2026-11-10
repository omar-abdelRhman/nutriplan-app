/**
 * NutriPlan - Main Entry Point
 * Builds the services (API, state, store), the pages and the router, then starts the app.
 */
import { NutriPlanAPI } from "./api/api.js";
import { AppState, FoodLogStore } from "./state/appState.js";
import { Router } from "./router/router.js";
import { Layout } from "./pages/layout.js";
import { MealsPage } from "./pages/mealsPage.js";
import { MealDetailsPage } from "./pages/mealDetailsPage.js";
import { ProductsPage } from "./pages/productsPage.js";
import { FoodLogPage } from "./pages/foodLogPage.js";

/** SweetAlert2 must exist before any dialog opens. If the <script> in index.html failed, load it here. */
function ensureSweetAlert() {
  if (typeof Swal !== "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js";
    script.onload = resolve;
    script.onerror = resolve; // do not block the app
    document.head.appendChild(script);
  });
}

class App {
  constructor() {
    this.api = new NutriPlanAPI();
    this.state = new AppState();
    this.store = new FoodLogStore();
    this.layout = new Layout();

    // pages need the router to navigate, router needs the pages -> create router first, fill routes after
    this.router = new Router({});
    const deps = { api: this.api, state: this.state, store: this.store, router: this.router };

    this.meals = new MealsPage(deps);
    this.details = new MealDetailsPage(deps);
    this.products = new ProductsPage(deps);
    this.foodLog = new FoodLogPage(deps);

    this.router.routes = {
      home: async () => {
        this.layout.showPage("home");
        await this.meals.show();
      },
      meal: async (id) => {
        this.layout.showPage("meal");
        await this.details.show(id);
      },
      products: async () => {
        this.layout.showPage("products");
        this.products.show();
      },
      foodlog: async () => {
        this.layout.showPage("foodlog");
        this.foodLog.show();
      },
    };
  }

  async init() {
    await ensureSweetAlert();
    this.layout.init();
    this.layout.showOverlay();

    this.meals.init();
    this.details.init();
    this.products.init();
    this.foodLog.init();

    // categories / areas / product categories load in parallel, none of them blocks the app
    await Promise.allSettled([this.meals.loadStatic(), this.products.loadCategories()]);

    await this.router.start();
    this.layout.hideOverlay();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App().init().catch((err) => {
    console.error("App failed to start", err);
    document.getElementById("app-loading-overlay").style.display = "none";
  });
});
