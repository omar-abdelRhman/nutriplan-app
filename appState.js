import { CONFIG } from "../config.js";

/**
 * FoodLogStore
 * Everything the user logs lives in LocalStorage (no API for this part).
 * Each entry: { id, type: "meal"|"product"|"custom", name, image, calories,
 *               protein, carbs, fat, date: "YYYY-MM-DD", loggedAt: timestamp }
 */
export class FoodLogStore {
  constructor(storageKey = CONFIG.STORAGE_KEY) {
    this.storageKey = storageKey;
    this.items = this.#load();
  }

  static dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  #load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  #save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (err) {
      console.error("Could not save food log", err);
    }
  }

  add(entry) {
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      loggedAt: Date.now(),
      date: FoodLogStore.dateKey(),
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      ...entry,
    };
    this.items.push(item);
    this.#save();
    return item;
  }

  remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    this.#save();
  }

  clearDay(dateKey = FoodLogStore.dateKey()) {
    this.items = this.items.filter((i) => i.date !== dateKey);
    this.#save();
  }

  itemsFor(dateKey = FoodLogStore.dateKey()) {
    return this.items.filter((i) => i.date === dateKey).sort((a, b) => b.loggedAt - a.loggedAt);
  }

  totalsFor(dateKey = FoodLogStore.dateKey()) {
    return this.itemsFor(dateKey).reduce(
      (t, i) => ({
        calories: t.calories + (Number(i.calories) || 0),
        protein: t.protein + (Number(i.protein) || 0),
        carbs: t.carbs + (Number(i.carbs) || 0),
        fat: t.fat + (Number(i.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  /** Current week, Monday -> Sunday, with totals per day (weekly overview). */
  weekDays() {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = FoodLogStore.dateKey(d);
      days.push({
        date: key,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: key === FoodLogStore.dateKey(today),
        count: this.itemsFor(key).length,
        ...this.totalsFor(key),
      });
    }
    return days;
  }

  /** Last `n` days (oldest first) with their totals — used by the weekly chart. */
  lastDays(n = 7) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = FoodLogStore.dateKey(d);
      days.push({
        date: key,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        ...this.totalsFor(key),
      });
    }
    return days;
  }
}

/**
 * AppState
 * Plain holder for the UI state shared between pages.
 */
export class AppState {
  constructor() {
    this.currentPage = "home";
    this.meals = [];
    this.viewMode = "grid"; // "grid" | "list"
    this.activeCategory = "";
    this.activeArea = "";
    this.currentMeal = null;
    this.currentNutrition = null;
    this.products = [];
    this.productGrade = "";
    this.nutritionCache = new Map();
  }
}
