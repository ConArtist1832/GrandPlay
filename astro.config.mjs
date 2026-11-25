// @ts-check
import { defineConfig } from 'astro/config';

// For GitHub Pages: set SITE to https://<user>.github.io and BASE to /<repo-name>
// (the deploy workflow sets these automatically). For a custom domain, set BASE to '/'.
export default defineConfig({
  site: process.env.SITE ?? 'https://example.github.io',
  base: process.env.BASE ?? '/',
});
