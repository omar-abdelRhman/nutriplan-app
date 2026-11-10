# NutriPlan - Setup

1. Open `src/js/config.js` and put your USDA key in `USDA_API_KEY`
   (free: https://fdc.nal.usda.gov/api-key-signup.html).
2. Run with VS Code Live Server (ES modules need a server, not file://).
3. Routes (hash based): `#home`, `#products`, `#foodlog`, `#meal/<id>`.

If a list comes back empty, open the browser console: the nutrition response is logged
as `[NutriPlan] nutrition response:`. Endpoint names that were guessed live in
`src/js/api/api.js` (filter params, barcode path, category path).
