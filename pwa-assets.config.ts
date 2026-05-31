import { defineConfig } from '@vite-pwa/assets-generator/config';

/**
 * PWA icon generation. Source: public/icon-source.svg (full-bleed maroon
 * with the brand sun centered inside the maskable safe zone).
 *
 * Regenerate with: npx pwa-assets-generator
 * Outputs into public/: pwa-64x64.png, pwa-192x192.png, pwa-512x512.png,
 * maskable-icon-512x512.png, apple-touch-icon-180x180.png, favicon.ico
 */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[48, 'favicon.ico']],
    },
    // Source already bleeds to the edge, so no extra padding — the maroon
    // fills the maskable bleed area and the sun stays in the safe zone.
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { background: '#6B1F2A' },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: '#6B1F2A' },
    },
  },
  images: ['public/icon-source.svg'],
});
