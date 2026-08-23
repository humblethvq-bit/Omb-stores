# Product Images

Put real OMB Stores product photos here, then reference them from
`src/OMBStores.jsx` in the `PRODUCTS` array using a path like:

```js
image: "/images/products/iphone-13.jpg",
images: [
  "/images/products/iphone-13-front.jpg",
  "/images/products/iphone-13-back.jpg",
  "/images/products/iphone-13-box.jpg",
],
```

Any file placed in this folder is served from the site root at
`/images/products/<filename>` — no import statement needed.

Until a product has a real photo, the site automatically shows a
clean in-brand fallback icon instead of a broken-image icon, so it's
safe to leave `image`/`images` unset.
