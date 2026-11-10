import { $, $$, setVisible } from "../utils/helpers.js";

/**
 * Layout
 * Owns everything that is shared between pages: sidebar (desktop + mobile),
 * header text, active nav link, which sections are visible, loading overlay.
 */
const SECTIONS = {
  home: ["search-filters-section", "meal-categories-section", "all-recipes-section"],
  meal: ["meal-details"],
  products: ["products-section"],
  foodlog: ["foodlog-section"],
};

const PAGES = {
  home: { title: "Meals & Recipes", subtitle: "Discover delicious and nutritious recipes tailored for you", nav: 0 },
  meal: { title: "Recipe Details", subtitle: "Ingredients, steps, video and nutrition facts", nav: 0 },
  products: { title: "Product Scanner", subtitle: "Search packaged foods by name or barcode", nav: 1 },
  foodlog: { title: "Food Log", subtitle: "Track your daily nutrition and food intake", nav: 2 },
};

const NAV_HREFS = ["#home", "#products", "#foodlog"];
const NAV_ACTIVE = ["bg-emerald-50", "text-emerald-700"];
const NAV_IDLE = ["text-gray-600", "hover:bg-gray-50"];

export class Layout {
  init() {
    $$(".nav-link").forEach((link, i) => {
      link.setAttribute("href", NAV_HREFS[i] || "#home");
      link.addEventListener("click", () => this.closeSidebar());
    });

    $("#header-menu-btn")?.addEventListener("click", () => this.toggleSidebar());
    $("#sidebar-close-btn")?.addEventListener("click", () => this.closeSidebar());
    $("#sidebar-overlay")?.addEventListener("click", () => this.closeSidebar());
  }

  showPage(name) {
    const all = Object.values(SECTIONS).flat();
    all.forEach((id) => setVisible(document.getElementById(id), false));
    SECTIONS[name].forEach((id) => setVisible(document.getElementById(id), true));

    const meta = PAGES[name];
    $("#header h1").textContent = meta.title;
    $("#header p").textContent = meta.subtitle;
    document.title = `${meta.title} | NutriPlan`;

    $$(".nav-link").forEach((link, i) => {
      const active = i === meta.nav;
      link.classList.remove(...(active ? NAV_IDLE : NAV_ACTIVE));
      link.classList.add(...(active ? NAV_ACTIVE : NAV_IDLE));
      const label = link.querySelector("span");
      label?.classList.toggle("font-semibold", active);
      label?.classList.toggle("font-medium", !active);
    });
    this.closeSidebar();
  }

  toggleSidebar() {
    $("#sidebar").classList.toggle("open");
    $("#sidebar-overlay").classList.toggle("active");
  }

  closeSidebar() {
    $("#sidebar")?.classList.remove("open");
    $("#sidebar-overlay")?.classList.remove("active");
  }

  showOverlay() {
    const o = $("#app-loading-overlay");
    o.style.display = "flex";
    o.style.opacity = "1";
  }

  hideOverlay() {
    const o = $("#app-loading-overlay");
    o.style.opacity = "0";
    setTimeout(() => (o.style.display = "none"), 500);
  }
}
