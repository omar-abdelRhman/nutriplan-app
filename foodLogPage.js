import { $, $$, round } from "../utils/helpers.js";
import { UI } from "../ui/components.js";
import { CONFIG } from "../config.js";

/** Food Log: today's progress vs goals, logged items, weekly chart, quick actions. */
export class FoodLogPage {
  constructor({ store, router }) {
    this.store = store;
    this.router = router;
  }

  init() {
    this.section = $("#foodlog-section");

    const actions = ["meals", "products", "custom"];
    $$(".quick-log-btn").forEach((btn, i) => (btn.dataset.action = actions[i]));

    this.section.addEventListener("click", (e) => {
      const remove = e.target.closest(".remove-log-btn");
      if (remove) return this.removeItem(remove.dataset.id);
      if (e.target.closest("#clear-foodlog")) return this.clearAll();

      const nav = e.target.closest("[data-nav]");
      if (nav) return this.router.navigate(nav.dataset.nav);

      const quick = e.target.closest(".quick-log-btn");
      if (quick) {
        const action = quick.dataset.action;
        if (action === "meals") this.router.navigate("home");
        if (action === "products") this.router.navigate("products");
        if (action === "custom") this.customEntry();
      }
    });

  }

  show() {
    this.render();
  }

  render() {
    $("#foodlog-date").textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    $("#foodlog-today-section").innerHTML = UI.foodLogToday(this.store.totalsFor(), this.store.itemsFor());
    this.renderWeek();
  }

  renderWeek() {
    const days = this.store.weekDays();
    const goal = CONFIG.GOALS.calories;
    const active = days.filter((d) => d.count > 0);

    const grid = $("#weekly-chart");
    grid.className = "grid grid-cols-7 gap-3";
    grid.innerHTML = UI.weekGrid(days);

    let stats = $("#weekly-stats");
    if (!stats) {
      grid.insertAdjacentHTML("afterend", '<div id="weekly-stats" class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6"></div>');
      stats = $("#weekly-stats");
    }
    stats.innerHTML = UI.weekStats({
      average: active.length ? active.reduce((t, d) => t + d.calories, 0) / active.length : 0,
      items: days.reduce((t, d) => t + d.count, 0),
      daysOnGoal: days.filter((d) => d.calories > 0 && d.calories <= goal).length,
    });
  }

  async removeItem(id) {
    this.store.remove(id);
    this.render();
    UI.toast("success", "Item removed");
  }

  async clearAll() {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Clear today's log?",
      text: "All items logged today will be removed.",
      showCancelButton: true,
      confirmButtonText: "Yes, clear it",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    this.store.clearDay();
    this.render();
    UI.toast("success", "Food log cleared");
  }

  async customEntry() {
    const field = (id, label, placeholder, type = "number") =>
      `<label class="swal2-input-label" for="${id}" style="margin:12px 0 4px">${label}</label>
       <input id="${id}" type="${type}" min="0" step="any" class="swal2-input" style="margin:0;width:100%" placeholder="${placeholder}">`;

    const { isConfirmed, value } = await Swal.fire({
      title: "Custom entry",
      html:
        field("ce-name", "Food name", "e.g. Homemade juice", "text") +
        field("ce-cal", "Calories (kcal)", "0") +
        field("ce-pro", "Protein (g)", "0") +
        field("ce-carb", "Carbs (g)", "0") +
        field("ce-fat", "Fat (g)", "0"),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Add to Food Log",
      confirmButtonColor: "#7c3aed",
      preConfirm: () => {
        const num = (id) => Math.max(0, parseFloat(document.getElementById(id).value) || 0);
        const name = document.getElementById("ce-name").value.trim();
        if (!name) return Swal.showValidationMessage("Please enter a food name");
        const entry = { name, calories: num("ce-cal"), protein: num("ce-pro"), carbs: num("ce-carb"), fat: num("ce-fat") };
        if (!entry.calories && !entry.protein && !entry.carbs && !entry.fat)
          return Swal.showValidationMessage("Enter at least one nutrition value");
        return entry;
      },
    });
    if (!isConfirmed || !value) return;

    this.store.add({ type: "custom", ...value });
    this.render();
    UI.toast("success", `${value.name} added`);
  }
}
