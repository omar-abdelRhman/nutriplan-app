import { esc, round } from "../utils/helpers.js";
import { CONFIG } from "../config.js";

/**
 * UI
 * Pure "data in -> HTML string out" renderers + a few tiny helpers.
 * Only Tailwind classes that already exist in src/css/index.css are used.
 */

const PALETTES = [
  { box: "from-red-50 to-rose-50 border-red-200 hover:border-red-400", icon: "from-red-400 to-rose-500" },
  { box: "from-orange-50 to-amber-50 border-orange-200 hover:border-orange-400", icon: "from-orange-400 to-amber-500" },
  { box: "from-pink-50 to-rose-50 border-pink-200 hover:border-pink-400", icon: "from-pink-400 to-rose-500" },
  { box: "from-yellow-50 to-amber-50 border-yellow-200 hover:border-yellow-400", icon: "from-yellow-400 to-amber-500" },
  { box: "from-lime-50 to-green-50 border-lime-200 hover:border-lime-400", icon: "from-lime-400 to-green-500" },
  { box: "from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-400", icon: "from-emerald-400 to-green-500" },
  { box: "from-cyan-50 to-blue-50 border-cyan-200 hover:border-cyan-400", icon: "from-cyan-400 to-blue-500" },
  { box: "from-slate-50 to-gray-50 border-slate-200 hover:border-slate-400", icon: "from-slate-400 to-gray-500" },
  { box: "from-stone-50 to-gray-50 border-stone-200 hover:border-stone-400", icon: "from-stone-400 to-gray-500" },
];

const CATEGORY_ICONS = {
  beef: "fa-drumstick-bite",
  chicken: "fa-drumstick-bite",
  lamb: "fa-drumstick-bite",
  goat: "fa-drumstick-bite",
  dessert: "fa-cake-candles",
  pasta: "fa-bowl-food",
  pork: "fa-bacon",
  seafood: "fa-fish",
  side: "fa-plate-wheat",
  starter: "fa-utensils",
  vegan: "fa-leaf",
  vegetarian: "fa-seedling",
  breakfast: "fa-bread-slice",
  miscellaneous: "fa-bowl-rice",
};

const PRODUCT_CATEGORY_STYLES = [
  { match: /cereal|breakfast/i, grad: "from-amber-500 to-orange-500", icon: "fa-wheat-awn" },
  { match: /beverage|drink/i, grad: "from-blue-500 to-cyan-500", icon: "fa-bottle-water" },
  { match: /snack/i, grad: "from-purple-500 to-pink-500", icon: "fa-cookie" },
  { match: /dairy|milk|cheese/i, grad: "from-cyan-500 to-blue-500", icon: "fa-cheese" },
  { match: /fruit/i, grad: "from-red-500 to-rose-500", icon: "fa-apple-whole" },
  { match: /vegetable/i, grad: "from-green-500 to-emerald-500", icon: "fa-carrot" },
  { match: /bread|bakery/i, grad: "from-amber-600 to-orange-500", icon: "fa-bread-slice" },
  { match: /meat|fish|seafood/i, grad: "from-red-500 to-orange-500", icon: "fa-drumstick-bite" },
];

const NUTRI_COLORS = { a: "bg-green-500", b: "bg-lime-500", c: "bg-yellow-500", d: "bg-orange-500", e: "bg-red-500" };
const NOVA_COLORS = { 1: "bg-green-500", 2: "bg-lime-500", 3: "bg-orange-500", 4: "bg-red-500" };

const PILL_ACTIVE =
  "px-4 py-2 bg-emerald-600 text-white rounded-full font-medium text-sm whitespace-nowrap hover:bg-emerald-700 transition-all area-filter-btn";
const PILL_IDLE =
  "px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium text-sm whitespace-nowrap hover:bg-gray-200 transition-all area-filter-btn";

export class UI {
  /* ---------------- generic states ---------------- */

  static spinner(text = "") {
    return `
      <div class="col-span-full flex flex-col items-center justify-center py-12" style="grid-column: 1 / -1">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        ${text ? `<p class="text-gray-500 text-sm mt-4">${esc(text)}</p>` : ""}
      </div>`;
  }

  static empty(title = "No recipes found", subtitle = "Try searching for something else", icon = "fa-search") {
    return `
      <div class="flex flex-col items-center justify-center py-12 text-center empty-state" style="grid-column: 1 / -1">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <i class="fa-solid ${icon} text-gray-400 text-2xl"></i>
        </div>
        <p class="text-gray-500 text-lg">${esc(title)}</p>
        <p class="text-gray-400 text-sm mt-2">${esc(subtitle)}</p>
      </div>`;
  }

  static error(message = "Something went wrong", retryAttr = "") {
    return `
      <div class="flex flex-col items-center justify-center py-12 text-center empty-state" style="grid-column: 1 / -1">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <i class="fa-solid fa-triangle-exclamation text-red-500 text-2xl"></i>
        </div>
        <p class="text-gray-700 text-lg">${esc(message)}</p>
        ${
          retryAttr
            ? `<button ${retryAttr} class="mt-4 px-5 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all">
                 <i class="fa-solid fa-rotate-right mr-2"></i>Try again
               </button>`
            : ""
        }
      </div>`;
  }

  static toast(icon, title) {
    return Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  }

  /* ---------------- meals page ---------------- */

  static categoryCard(category, index = 0, active = false) {
    const palette = PALETTES[index % PALETTES.length];
    const icon = CATEGORY_ICONS[category.name.toLowerCase()] || "fa-utensils";
    return `
      <div class="category-card bg-gradient-to-br ${palette.box} rounded-xl p-3 border hover:shadow-md cursor-pointer transition-all group ${
        active ? "ring-2 ring-gray-900" : ""
      }" data-category="${esc(category.name)}">
        <div class="flex items-center gap-2.5">
          <div class="text-white w-9 h-9 bg-gradient-to-br ${palette.icon} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <i class="fa-solid ${icon}"></i>
          </div>
          <div><h3 class="text-sm font-bold text-gray-900">${esc(category.name)}</h3></div>
        </div>
      </div>`;
  }

  static areaPills(areas, activeArea = "") {
    const all = `<button class="${activeArea ? PILL_IDLE : PILL_ACTIVE}" data-area="">All Recipes</button>`;
    return (
      all +
      areas
        .map(
          (a) =>
            `<button class="${a === activeArea ? PILL_ACTIVE : PILL_IDLE}" data-area="${esc(a)}">${esc(a)}</button>`
        )
        .join("")
    );
  }

  static recipeCard(meal, listView = false) {
    const blurb = meal.tags.slice(0, 3).join(" · ") || "Delicious recipe to try!";
    const img = meal.thumbnail
      ? `<img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${esc(
          meal.thumbnail
        )}" alt="${esc(meal.name)}" loading="lazy" />`
      : `<div class="w-full h-full bg-gray-100 flex items-center justify-center"><i class="fa-solid fa-utensils text-gray-300 text-3xl"></i></div>`;

    return `
      <div class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group ${
        listView ? "flex" : ""
      }" data-meal-id="${esc(meal.id)}">
        <div class="relative ${listView ? "w-48 h-48 shrink-0" : "h-48"} overflow-hidden">
          ${img}
          <div class="absolute bottom-3 left-3 flex gap-2">
            ${
              meal.category
                ? `<span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-gray-700">${esc(meal.category)}</span>`
                : ""
            }
            ${
              meal.area
                ? `<span class="px-2 py-1 bg-emerald-500 text-xs font-semibold rounded-full text-white">${esc(meal.area)}</span>`
                : ""
            }
          </div>
        </div>
        <div class="p-4 ${listView ? "flex-1" : ""}">
          <h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">${esc(meal.name)}</h3>
          <p class="text-xs text-gray-600 mb-3 line-clamp-2">${esc(blurb)}</p>
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-gray-900"><i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>${esc(meal.category || "Meal")}</span>
            <span class="font-semibold text-gray-500"><i class="fa-solid fa-globe text-blue-500 mr-1"></i>${esc(meal.area || "International")}</span>
          </div>
        </div>
      </div>`;
  }

  /* ---------------- meal details ---------------- */

  static mealDetails(meal) {
    const badges = [
      meal.category && `<span class="px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full">${esc(meal.category)}</span>`,
      meal.area && `<span class="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">${esc(meal.area)}</span>`,
      meal.tags[0] && `<span class="px-3 py-1 bg-purple-500 text-white text-sm font-semibold rounded-full">${esc(meal.tags[0])}</span>`,
    ]
      .filter(Boolean)
      .join("");

    const ingredients = meal.ingredients
      .map(
        (i) => `
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
          <input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300" />
          <span class="text-gray-700"><span class="font-medium text-gray-900">${esc(i.measure)}</span> ${esc(i.name)}</span>
        </div>`
      )
      .join("");

    const steps = meal.instructions
      .map(
        (text, idx) => `
        <div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
          <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">${idx + 1}</div>
          <p class="text-gray-700 leading-relaxed pt-2">${esc(text)}</p>
        </div>`
      )
      .join("");

    const video = meal.youtubeId
      ? `
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-video text-red-500"></i> Video Tutorial
          </h2>
          <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
            <iframe src="https://www.youtube.com/embed/${esc(meal.youtubeId)}" class="absolute inset-0 w-full h-full" frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </div>`
      : "";

    return `
      <div class="max-w-7xl mx-auto">
        <button id="back-to-meals-btn" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6 transition-colors">
          <i class="fa-solid fa-arrow-left"></i><span>Back to Recipes</span>
        </button>

        <div class="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div class="relative h-80 md:h-96">
            <img src="${esc(meal.thumbnail)}" alt="${esc(meal.name)}" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-8">
              <div class="flex items-center gap-3 mb-3">${badges}</div>
              <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">${esc(meal.name)}</h1>
              <div class="flex items-center gap-6 text-white/90">
                <span class="flex items-center gap-2"><i class="fa-solid fa-clock"></i><span>30 min</span></span>
                <span class="flex items-center gap-2"><i class="fa-solid fa-utensils"></i><span id="hero-servings">${CONFIG.DEFAULT_SERVINGS} servings</span></span>
                <span class="flex items-center gap-2"><i class="fa-solid fa-fire"></i><span id="hero-calories">-- cal/serving</span></span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-3 mb-8">
          <button id="log-meal-btn" class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all" data-meal-id="${esc(meal.id)}">
            <i class="fa-solid fa-clipboard-list"></i><span>Log This Meal</span>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-8">
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-list-check text-emerald-600"></i> Ingredients
                <span class="text-sm font-normal text-gray-500 ml-auto">${meal.ingredients.length} items</span>
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${ingredients}</div>
            </div>

            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-shoe-prints text-emerald-600"></i> Instructions
              </h2>
              <div class="space-y-4">${steps}</div>
            </div>

            ${video}
          </div>

          <div class="space-y-6">
            <div class="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-chart-pie text-emerald-600"></i> Nutrition Facts
              </h2>
              <div id="nutrition-facts-container">${UI.spinner("Analyzing nutrition...")}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  static nutritionFacts(n, servings) {
    const p = n.perServing;
    const t = n.total;
    const bar = (label, color, value, daily) => `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full ${color}"></div><span class="text-gray-700">${label}</span></div>
        <span class="font-bold text-gray-900">${round(value, 1)}g</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-2">
        <div class="${color} h-2 rounded-full" style="width: ${Math.min(100, round((value / daily) * 100))}%"></div>
      </div>`;

    return `
      <p class="text-sm text-gray-500 mb-4">Per serving</p>
      <div class="text-center py-4 mb-4 bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl">
        <p class="text-sm text-gray-600">Calories per serving</p>
        <p class="text-4xl font-bold text-emerald-600">${round(p.calories)}</p>
        <p class="text-xs text-gray-500 mt-1">Total: ${round(t.calories)} cal for ${servings} servings</p>
      </div>
      <div class="space-y-4">
        ${bar("Protein", "bg-emerald-500", p.protein, 50)}
        ${bar("Carbs", "bg-blue-500", p.carbs, 300)}
        ${bar("Fat", "bg-purple-500", p.fat, 65)}
        ${bar("Fiber", "bg-orange-500", p.fiber, 28)}
        ${bar("Sugar", "bg-pink-500", p.sugar, 50)}
      </div>`;
  }

  static nutritionError(message, canRetry = true) {
    return `
      <div class="text-center py-6">
        <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <i class="fa-solid fa-triangle-exclamation text-red-500 text-xl"></i>
        </div>
        <p class="text-gray-700 text-sm">${esc(message)}</p>
        ${
          canRetry
            ? `<button id="retry-nutrition-btn" class="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all">Try again</button>`
            : ""
        }
      </div>`;
  }

  /* ---------------- products ---------------- */

  static productCategoryButtons(categories) {
    return categories
      .map((c, i) => {
        const style = PRODUCT_CATEGORY_STYLES.find((st) => st.match.test(c.name)) || PRODUCT_CATEGORY_STYLES[i % PRODUCT_CATEGORY_STYLES.length];
        return `
        <button class="product-category-btn bg-gradient-to-r ${style.grad} text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow-lg transition-all" data-category="${esc(c.value || c.name)}">
          <i class="fa-solid ${style.icon} mr-1.5"></i>${esc(c.name)}
        </button>`;
      })
      .join("");
  }

  static productCard(p) {
    const n = p.nutrition;
    const mini = (value, label, bg, text) => `
      <div class="${bg} rounded p-1.5">
        <p class="text-xs font-bold ${text}">${round(value, 1)}g</p>
        <p class="text-[10px] text-gray-500">${label}</p>
      </div>`;

    return `
      <div class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all group" data-barcode="${esc(p.barcode)}">
        <div class="relative h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
          ${
            p.image
              ? `<img class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" />`
              : `<i class="fa-solid fa-box-open text-gray-300 text-4xl"></i>`
          }
          ${
            p.nutriscore
              ? `<div class="absolute top-2 left-2 ${NUTRI_COLORS[p.nutriscore]} text-white text-xs font-bold px-2 py-1 rounded uppercase">Nutri-Score ${p.nutriscore}</div>`
              : ""
          }
          ${
            p.nova
              ? `<div class="absolute top-2 right-2 ${NOVA_COLORS[p.nova] || "bg-gray-400"} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" title="NOVA ${esc(p.nova)}">${esc(p.nova)}</div>`
              : ""
          }
        </div>
        <div class="p-4">
          <p class="text-xs text-emerald-600 font-semibold mb-1 truncate">${esc(p.brand || "Unknown brand")}</p>
          <h3 class="font-bold text-gray-900 mb-2 line-clamp-2">${esc(p.name)}</h3>
          <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
            ${p.quantity ? `<span><i class="fa-solid fa-weight-scale mr-1"></i>${esc(p.quantity)}</span>` : ""}
            <span><i class="fa-solid fa-fire mr-1"></i>${round(n.calories)} kcal/100g</span>
          </div>
          <div class="grid grid-cols-4 gap-1 text-center">
            ${mini(n.protein, "Protein", "bg-emerald-50", "text-emerald-700")}
            ${mini(n.carbs, "Carbs", "bg-blue-50", "text-blue-700")}
            ${mini(n.fat, "Fat", "bg-purple-50", "text-purple-700")}
            ${mini(n.sugar, "Sugar", "bg-orange-50", "text-orange-700")}
          </div>
          <button class="log-product-btn w-full mt-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all">
            <i class="fa-solid fa-plus mr-1"></i>Log this product
          </button>
        </div>
      </div>`;
  }

  /* ---------------- food log ---------------- */

  static foodLogToday(totals, items) {
    const g = CONFIG.GOALS;
    const card = (label, bg, textColor, barColor, value, goal, unit) => {
      const pct = goal ? Math.min(100, round((value / goal) * 100)) : 0;
      const full = value >= goal;
      return `
        <div class="${bg} rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-gray-700">${label}</span>
            <span class="text-xs font-semibold ${full ? "text-red-600" : textColor}">${pct}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div class="${full ? "bg-red-500" : barColor} h-2.5 rounded-full progress-bar" style="width: ${pct}%"></div>
          </div>
          <div class="flex items-center justify-between mt-2 text-sm">
            <span class="font-bold ${full ? "text-red-700" : textColor}">${round(value)} ${unit}</span>
            <span class="text-gray-400">/ ${goal} ${unit}</span>
          </div>
        </div>`;
    };

    const list = items.length
      ? items.map(UI.loggedItem).join("")
      : `
        <div class="text-center py-10 text-gray-500">
          <i class="fa-solid fa-utensils text-5xl mb-4 text-gray-300"></i>
          <p class="font-medium text-gray-700">No food logged today</p>
          <p class="text-sm mb-5">Start tracking your nutrition by logging meals or scanning products</p>
          <div class="flex items-center justify-center gap-3">
            <button data-nav="home" class="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-all">
              <i class="fa-solid fa-plus mr-2"></i>Browse Recipes
            </button>
            <button data-nav="products" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-all">
              <i class="fa-solid fa-barcode mr-2"></i>Scan Product
            </button>
          </div>
        </div>`;

    return `
      <h3 class="text-lg font-bold text-gray-900 mb-4"><i class="fa-solid fa-fire text-orange-500 mr-2"></i>Today's Nutrition</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${card("Calories", "bg-emerald-50", "text-emerald-600", "bg-emerald-500", totals.calories, g.calories, "kcal")}
        ${card("Protein", "bg-blue-50", "text-blue-600", "bg-blue-500", totals.protein, g.protein, "g")}
        ${card("Carbs", "bg-amber-50", "text-amber-600", "bg-amber-500", totals.carbs, g.carbs, "g")}
        ${card("Fat", "bg-purple-50", "text-purple-600", "bg-purple-500", totals.fat, g.fat, "g")}
      </div>
      <div class="border-t border-gray-200 pt-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-gray-700">Logged Items (${items.length})</h4>
          <button id="clear-foodlog" class="text-red-500 hover:text-red-600 text-sm font-medium" style="display: ${items.length ? "" : "none"}">
            <i class="fa-solid fa-trash mr-1"></i>Clear All
          </button>
        </div>
        <div id="logged-items-list" class="space-y-2">${list}</div>
      </div>`;
  }

  static loggedItem(item) {
    const time = new Date(item.loggedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const typeLabel = { meal: "Recipe", product: "Product", custom: "Custom" }[item.type] || "Item";
    const servings = item.servings || 1;
    return `
      <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
        ${
          item.image
            ? `<img src="${esc(item.image)}" alt="" class="w-14 h-14 rounded-xl object-cover shrink-0" />`
            : `<div class="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center shrink-0"><i class="fa-solid fa-utensils text-gray-400"></i></div>`
        }
        <div class="flex-1">
          <p class="font-semibold text-gray-900 line-clamp-1">${esc(item.name)}</p>
          <p class="text-sm text-gray-500">${servings} serving${servings === 1 ? "" : "s"} <span class="mx-1">•</span> <span class="text-emerald-600">${typeLabel}</span></p>
          <p class="text-xs text-gray-400">${time}</p>
        </div>
        <div class="text-center">
          <p class="text-xl font-bold text-emerald-600">${round(item.calories)}</p>
          <p class="text-xs text-gray-500">kcal</p>
        </div>
        <div class="flex items-center gap-4 text-xs text-gray-500">
          <span>${round(item.protein)}g P</span><span>${round(item.carbs)}g C</span><span>${round(item.fat)}g F</span>
        </div>
        <button class="remove-log-btn p-2 text-gray-400 hover:text-red-500 transition-colors" data-id="${esc(item.id)}" aria-label="Remove">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>`;
  }

  static weekGrid(days) {
    return days
      .map(
        (d) => `
        <div class="rounded-xl p-3 text-center ${d.isToday ? "bg-emerald-50 border-2 border-emerald-200" : "bg-gray-50"}">
          <p class="text-xs text-gray-500 font-medium">${d.label}</p>
          <p class="text-lg font-bold text-gray-900">${d.dayNum}</p>
          <p class="text-xs mt-1 ${d.calories > CONFIG.GOALS.calories ? "text-red-600 font-semibold" : d.calories ? "text-emerald-600 font-semibold" : "text-gray-400"}">${
            d.calories ? round(d.calories) + " kcal" : "—"
          }</p>
        </div>`
      )
      .join("");
  }

  static weekStats({ average, items, daysOnGoal }) {
    const stat = (icon, bg, color, label, value) => `
      <div class="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl ${bg} flex items-center justify-center"><i class="fa-solid ${icon} ${color} text-xl"></i></div>
        <div><p class="text-xs text-gray-500">${label}</p><p class="text-xl font-bold text-gray-900">${value}</p></div>
      </div>`;
    return (
      stat("fa-chart-line", "bg-emerald-100", "text-emerald-600", "Weekly Average", `${round(average)} kcal`) +
      stat("fa-utensils", "bg-blue-100", "text-blue-600", "Total Items This Week", `${items} items`) +
      stat("fa-bullseye", "bg-purple-100", "text-purple-600", "Days On Goal", `${daysOnGoal} / 7`)
    );
  }

  /* ---------------- log dialogs ---------------- */

  /** Servings picker modal (matches the reference design). Resolves to servings number or null. */
  static async logModal({ title, name, image, nutrition, note = "", confirmText }) {
    const stat = (v, label, color) =>
      `<div style="text-align:center"><div style="font-size:1.4rem;font-weight:700;color:${color}">${v}</div><div style="font-size:.75rem;color:#6b7280">${label}</div></div>`;
    const btn =
      "width:44px;height:44px;border-radius:10px;border:0;background:#f3f4f6;color:#374151;font-size:1.3rem;cursor:pointer";

    const result = await Swal.fire({
      width: 520,
      html: `
        <div style="display:flex;align-items:center;gap:14px;text-align:left;margin-bottom:22px">
          ${image ? `<img src="${esc(image)}" alt="" style="width:64px;height:64px;border-radius:12px;object-fit:cover">` : ""}
          <div>
            <div style="font-size:1.3rem;font-weight:700;color:#111827">${esc(title)}</div>
            <div style="color:#6b7280">${esc(name)}</div>
          </div>
        </div>
        <div style="text-align:left;font-weight:600;color:#374151;margin-bottom:8px">Number of Servings</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px">
          <button type="button" id="srv-minus" style="${btn}">&minus;</button>
          <input id="srv-input" type="number" min="0.25" step="0.25" value="1"
            style="width:100px;height:44px;text-align:center;font-size:1.2rem;font-weight:600;border:1px solid #e5e7eb;border-radius:10px">
          <button type="button" id="srv-plus" style="${btn}">+</button>
        </div>
        <div style="background:#f0fdfa;border-radius:12px;padding:16px;text-align:left">
          <div style="font-size:.85rem;color:#4b5563;margin-bottom:12px">Estimated nutrition per serving${note}:</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
            ${stat(round(nutrition.calories), "Calories", "#0d9488")}
            ${stat(round(nutrition.protein) + "g", "Protein", "#2563eb")}
            ${stat(round(nutrition.carbs) + "g", "Carbs", "#ea580c")}
            ${stat(round(nutrition.fat) + "g", "Fat", "#9333ea")}
          </div>
        </div>`,
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: `<i class="fa-solid fa-clipboard-list"></i>&nbsp; ${esc(confirmText)}`,
      cancelButtonText: "Cancel",
      confirmButtonColor: "#0ea5e9",
      cancelButtonColor: "#9ca3af",
      didOpen: () => {
        const input = document.getElementById("srv-input");
        const step = (d) => {
          const v = Math.max(1, Math.round(parseFloat(input.value) || 1) + d);
          input.value = v;
        };
        document.getElementById("srv-minus").addEventListener("click", () => step(-1));
        document.getElementById("srv-plus").addEventListener("click", () => step(1));
      },
      preConfirm: () => {
        const v = parseFloat(document.getElementById("srv-input").value);
        if (!(v > 0)) return Swal.showValidationMessage("Enter a valid number of servings");
        return v;
      },
    });
    return result.isConfirmed ? result.value : null;
  }

  static loggedSuccess(name, servings, calories, what = "meal") {
    return Swal.fire({
      icon: "success",
      title: what === "meal" ? "Meal Logged!" : "Product Logged!",
      html: `<p style="color:#6b7280">${esc(name)} (${servings} serving${servings === 1 ? "" : "s"}) has been added to your daily log.</p>
             <p style="color:#10b981;font-weight:600;margin-top:10px">+${round(calories)} calories</p>`,
      showConfirmButton: false,
      timer: 2000,
    });
  }
}
