# OMB Stores

Only My Brothers — phone shop, accessories and repairs website for
Kasoa Danchira, Mataheko Junction, Ghana.

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

`npm run build` outputs a static site to `dist/`, which can be
deployed to any static host (Netlify, Vercel, GitHub Pages, cPanel,
etc.).

## Project structure

```
index.html              Vite entry HTML
src/
  main.jsx               Mounts the React app
  index.css               Tailwind entry point
  OMBStores.jsx          The entire site (all pages/components)
public/
  images/products/       Drop real product photos here
tailwind.config.js
postcss.config.js
vite.config.js
package.json
```

## Editing site content

Open `src/OMBStores.jsx`. Near the top of the file:

- **Contact details, WhatsApp number, address** — the config
  constants at the very top of the file.
- **`SITE_URL`, `SOCIAL_LINKS`, `GOOGLE_MAPS_QUERY`, `OPENING_HOURS`**
  — fill these in once confirmed; until then they're safely left
  blank/null rather than guessed.
- **`PRODUCTS`** — the full product catalog. Add `image`/`images`
  paths once real photos are in `public/images/products/`.
- **`REPAIR_SERVICES`** — list of repair services shown on the
  Repairs page.

## Notes

- All ordering, repair booking, and installment enquiries route
  through WhatsApp — there is no backend yet. See the "Future
  backend readiness" notes inside `OMBStores.jsx` for how the data
  shapes are already structured to support one later.
- The cart persists in the browser via `localStorage`.
