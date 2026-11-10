import { $, round } from "../utils/helpers.js";
import { UI } from "../ui/components.js";
import { CONFIG } from "../config.js";

/** Meal details: recipe, video, USDA nutrition facts and the "Log This Meal" button. */
export class MealDetailsPage {
  constructor({ api, state, store, router }) {
    this.api = api;
    this.state = state;
    this.store = store;
    this.router = router;
  }

  init() {
    this.section = $("#meal-details");
    this.section.addEventListener("click", (e) => {
      if (e.target.closest("#back-to-meals-btn")) return this.router.navigate("home");
      if (e.target.closest("#log-meal-btn")) return this.logMeal();
      if (e.target.closest("#retry-nutrition-btn")) return this.loadNutrition();
      if (e.target.closest("[data-retry]")) return this.show(this.state.currentMeal?.id || this.lastId);
    });
  }

  async show(id) {
    this.lastId = id;
    this.state.currentNutrition = null;
    this.section.innerHTML = `<div class="max-w-7xl mx-auto">${UI.spinner("Loading recipe...")}</div>`;

    try {
      const meal = await this.api.getMeal(id);
      if (!meal || !meal.name) throw new Error("Meal not found");
      this.state.currentMeal = meal;
      this.section.innerHTML = UI.mealDetails(meal);
      document.title = `${meal.name} | NutriPlan`;
      this.loadNutrition();
    } catch (err) {
      console.error(err);
      this.section.innerHTML = `
        <div class="max-w-7xl mx-auto">
          <button id="back-to-meals-btn" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6 transition-colors">
            <i class="fa-solid fa-arrow-left"></i><span>Back to Recipes</span>
          </button>
          ${UI.error("Could not load this recipe.", "data-retry")}
        </div>`;
    }
  }

  async loadNutrition() {
    const meal = this.state.currentMeal;
    const box = $("#nutrition-facts-container");
    if (!meal || !box) return;

    const cached = this.state.nutritionCache.get(meal.id);
    if (cached) return this.#renderNutrition(cached);

    box.innerHTML = UI.spinner("Analyzing nutrition...");
    try {
      const ingredients = meal.ingredients.map((i) => `${i.measure} ${i.name}`.trim());
      const result = await this.api.analyzeNutrition(meal.name, ingredients);
      this.state.nutritionCache.set(meal.id, result);
      if (this.state.currentMeal?.id !== meal.id) return; // user already left
      this.#renderNutrition(result);
    } catch (err) {
      console.error(err);
      if (this.state.currentMeal?.id !== meal.id) return;
      const msg =
        err.code === "NO_KEY"
          ? err.message
          : err.status === 401 || err.status === 403
          ? "The USDA API key was rejected. Check it in src/js/config.js"
          : "Could not load nutrition facts.";
      $("#nutrition-facts-container").innerHTML = UI.nutritionError(msg, err.code !== "NO_KEY");
    }
  }

  #renderNutrition(result) {
    this.state.currentNutrition = result;
    $("#nutrition-facts-container").innerHTML = UI.nutritionFacts(result, result.servings);
    $("#hero-calories").textContent = `${round(result.perServing.calories)} cal/serving`;
    $("#hero-servings").textContent = `${result.servings || CONFIG.DEFAULT_SERVINGS} servings`;
  }

  async logMeal() {
    const meal = this.state.currentMeal;
    const nutrition = this.state.currentNutrition;

    // If USDA nutrition is not available (no key / request failed) the meal can still be logged, with 0 values.
    const per = nutrition?.perServing || { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const servings = await UI.logModal({
      title: "Log This Meal",
      name: meal.name,
      image: meal.thumbnail,
      nutrition: per,
      note: nutrition ? "" : " (not available)",
      confirmText: "Log Meal",
    });
    if (!servings) return;

    const p = per;
    this.store.add({
      type: "meal",
      mealId: meal.id,
      name: meal.name,
      image: meal.thumbnail,
      servings,
      calories: p.calories * servings,
      protein: p.protein * servings,
      carbs: p.carbs * servings,
      fat: p.fat * servings,
    });
    UI.loggedSuccess(meal.name, servings, p.calories * servings, "meal");
  }
}
