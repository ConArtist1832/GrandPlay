# GrandPlay website

Homepage for **GrandPlay**, HY-PRO's range of giant garden and lawn games. Built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Run locally (macOS)

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
```

## Edit content

All copy, products and occasions live at the top of `src/pages/index.astro`. Items marked `TODO` are placeholders waiting on real details (prices, shop link, contact email). The promo video lives in `public/video/`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`. One-off setup: in the repo go to **Settings → Pages → Source** and choose **GitHub Actions**.
