/**
 * Normalizer
 * The API proxies TheMealDB / USDA / OpenFoodFacts. To stay safe against small
 * differences in the response shape, every response goes through this class so
 * the rest of the app only ever sees ONE clean shape.
 */

const key = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");

const LIST_KEYS = ["results", "data", "meals", "products", "categories", "areas", "items"];
const ONE_KEYS = ["result", "data", "meal", "product", "item"];

const ALIASES = {
  calories: ["calories", "kcal", "energykcal", "energykcal100g", "energykcalvalue", "energy"],
  protein: ["protein", "proteins", "protein100g", "proteins100g"],
  carbs: ["carbs", "carbohydrates", "carbohydrate", "carbs100g", "carbohydrates100g"],
  fat: ["fat", "fats", "totalfat", "fat100g"],
  fiber: ["fiber", "fibre", "fibers", "fiber100g"],
  sugar: ["sugar", "sugars", "sugar100g", "sugars100g"],
};

export class Normalizer {
  /* ---------- generic helpers ---------- */

  /** Turn any API response into an array. */
  static list(json) {
    if (Array.isArray(json)) return json;
    if (!json || typeof json !== "object") return [];
    for (const k of LIST_KEYS) {
      if (Array.isArray(json[k])) return json[k];
    }
    if (json.data && typeof json.data === "object") return Normalizer.list(json.data);
    const anyArray = Object.values(json).find(Array.isArray);
    return anyArray || [];
  }

  /** Turn any API response into a single object. */
  static one(json) {
    if (Array.isArray(json)) return json[0] ?? null;
    if (!json || typeof json !== "object") return null;
    for (const k of ONE_KEYS) {
      if (json[k]) return Array.isArray(json[k]) ? json[k][0] ?? null : json[k];
    }
    for (const k of LIST_KEYS) {
      if (Array.isArray(json[k])) return json[k][0] ?? null;
    }
    return json;
  }

  /** Breadth-first search for the first matching key (case/underscore-insensitive). */
  static find(obj, aliases, maxDepth = 3) {
    if (!obj || typeof obj !== "object") return undefined;
    const wanted = aliases.map(key);
    let level = [obj];
    for (let depth = 0; depth <= maxDepth && level.length; depth++) {
      const next = [];
      for (const node of level) {
        if (!node || typeof node !== "object") continue;
        const map = new Map(Object.keys(node).map((k) => [key(k), k]));
        for (const alias of wanted) {
          if (map.has(alias)) {
            const v = node[map.get(alias)];
            if (v !== undefined && v !== null && v !== "") return v;
          }
        }
        next.push(...Object.values(node).filter((v) => v && typeof v === "object"));
      }
      level = next;
    }
    return undefined;
  }

  static num(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v === "string") return parseFloat(v) || 0;
    if (v && typeof v === "object") {
      return Normalizer.num(v.amount ?? v.value ?? v.quantity ?? v.total ?? 0);
    }
    return 0;
  }

  static nutrient(obj, name) {
    return Normalizer.num(Normalizer.find(obj, ALIASES[name]));
  }

  /* ---------- meals ---------- */

  static category(raw) {
    if (typeof raw === "string") return { name: raw };
    return { name: raw?.name ?? raw?.strCategory ?? raw?.category ?? "" };
  }

  static area(raw) {
    if (typeof raw === "string") return raw;
    return raw?.name ?? raw?.strArea ?? raw?.area ?? "";
  }

  static youtubeId(url) {
    if (!url || typeof url !== "string") return "";
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
    return m ? m[1] : "";
  }

  static meal(raw) {
    if (!raw) return null;

    let ingredients = [];
    if (Array.isArray(raw.ingredients)) {
      ingredients = raw.ingredients
        .map((i) =>
          typeof i === "string"
            ? { measure: "", name: i }
            : {
                measure: String(i.measure ?? i.strMeasure ?? i.quantity ?? i.amount ?? "").trim(),
                name: String(i.ingredient ?? i.name ?? i.strIngredient ?? "").trim(),
              }
        )
        .filter((i) => i.name);
    } else {
      for (let n = 1; n <= 20; n++) {
        const name = String(raw[`strIngredient${n}`] ?? "").trim();
        if (name) ingredients.push({ name, measure: String(raw[`strMeasure${n}`] ?? "").trim() });
      }
    }

    let instructions = raw.instructions ?? raw.strInstructions ?? [];
    if (typeof instructions === "string") {
      instructions = instructions
        .split(/\r?\n+/)
        .map((s) => s.trim())
        .filter((s) => s && !/^step\s*\d+\s*:?$/i.test(s) && !/^\d+\.?$/.test(s));
    }

    let tags = raw.tags ?? raw.strTags ?? [];
    if (typeof tags === "string") tags = tags.split(",").map((t) => t.trim()).filter(Boolean);

    return {
      id: String(raw.id ?? raw.idMeal ?? raw._id ?? ""),
      name: raw.name ?? raw.strMeal ?? raw.title ?? "Untitled meal",
      thumbnail: raw.thumbnail ?? raw.image ?? raw.img ?? raw.strMealThumb ?? "",
      category: raw.category ?? raw.strCategory ?? "",
      area: raw.area ?? raw.strArea ?? "",
      tags,
      instructions,
      ingredients,
      youtubeId: Normalizer.youtubeId(raw.youtube ?? raw.strYoutube ?? raw.video ?? raw.youtubeUrl ?? ""),
    };
  }

  /**
   * Nutrition analysis response -> { perServing, total, servings }
   * Each nutrient object: { calories, protein, carbs, fat, fiber, sugar }
   */
  static nutrition(raw, fallbackServings = 4) {
    const read = (src) => ({
      calories: Normalizer.nutrient(src, "calories"),
      protein: Normalizer.nutrient(src, "protein"),
      carbs: Normalizer.nutrient(src, "carbs"),
      fat: Normalizer.nutrient(src, "fat"),
      fiber: Normalizer.nutrient(src, "fiber"),
      sugar: Normalizer.nutrient(src, "sugar"),
    });
    const scale = (n, f) => Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v * f]));

    const servings = Normalizer.num(Normalizer.find(raw, ["servings", "serving", "yield"])) || fallbackServings;
    const per = Normalizer.find(raw, ["perServing", "per_serving", "servingNutrition"]);
    const tot = Normalizer.find(raw, ["totals", "total", "totalNutrition"]);

    let perServing, total;
    if (per && typeof per === "object") {
      perServing = read(per);
      total = tot && typeof tot === "object" ? read(tot) : scale(perServing, servings);
    } else if (tot && typeof tot === "object") {
      total = read(tot);
      perServing = scale(total, 1 / servings);
    } else {
      total = read(raw);
      perServing = scale(total, 1 / servings);
    }
    return { perServing, total, servings };
  }

  /* ---------- products ---------- */

  static product(raw) {
    if (!raw) return null;
    const grade = String(
      raw.nutriscore ?? raw.nutriScore ?? raw.nutriscore_grade ?? raw.nutrition_grade ?? raw.nutritionGrade ?? raw.grade ?? ""
    )
      .toLowerCase()
      .trim();

    return {
      barcode: String(raw.barcode ?? raw.code ?? raw._id ?? raw.id ?? ""),
      name: raw.name ?? raw.product_name ?? raw.productName ?? "Unknown product",
      brand: raw.brand ?? raw.brands ?? "",
      image:
        raw.image ?? raw.image_url ?? raw.image_front_url ?? raw.image_front_small_url ?? raw.imageUrl ?? raw.thumbnail ?? "",
      nutriscore: /^[a-e]$/.test(grade) ? grade : "",
      nova: raw.nova ?? raw.nova_group ?? raw.novaGroup ?? "",
      quantity: raw.quantity ?? raw.serving_size ?? raw.servingSize ?? "",
      nutrition: {
        calories: Normalizer.nutrient(raw, "calories"),
        protein: Normalizer.nutrient(raw, "protein"),
        carbs: Normalizer.nutrient(raw, "carbs"),
        fat: Normalizer.nutrient(raw, "fat"),
        sugar: Normalizer.nutrient(raw, "sugar"),
      },
    };
  }
}
