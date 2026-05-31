/**
 * Test stub for the `virtual:pwa-register` module, which only exists when
 * vite-plugin-pwa runs (it does not run under vitest). Aliased in
 * vitest.config.ts so any test that transitively imports src/pwa.ts resolves
 * cleanly instead of failing on the missing virtual module.
 */
export function registerSW(): () => Promise<void> {
  return async () => {};
}
