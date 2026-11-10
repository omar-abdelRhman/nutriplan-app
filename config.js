/**
 * App configuration.
 * Put your USDA API key here (needed for the meal nutrition endpoint).
 * Get one free: https://fdc.nal.usda.gov/api-key-signup.html
 */
export const CONFIG = {
  BASE_URL: "https://nutriplan-api.vercel.app/api",
  USDA_API_KEY: "F6PF7B9PnnjkcjpqKKBpKhfQNWMLgztzjfzfNJ9C",
  STORAGE_KEY: "nutriplan_foodlog_v1",
  DEFAULT_SERVINGS: 4,
  MEALS_LIMIT: 25,
  PRODUCTS_LIMIT: 24,
  GOALS: { calories: 2000, protein: 50, carbs: 250, fat: 65 },
};
