# GrandPlay website

Homepage for **GrandPlay**, HY-PRO's range of giant garden and lawn games. Built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Run locally (macOS)

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
```

## Edit content

All copy, products and occasions live at the top of `src/pages/index.astro`. Prices and sizes are in the `products` list. The basket runs in the browser only (no backend): "Send order enquiry" emails the order. Items marked `TODO` (contact and orders email) are placeholders. The promo video lives in `public/video/`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`. One-off setup: in the repo go to **Settings → Pages → Source** and choose **GitHub Actions**.
