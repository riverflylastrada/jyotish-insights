/**
 * Feature-flag stub for plan gating (TODO: wire to billing when ready).
 * Returns true for all features — ungated until billing ships.
 */
export function usePlanGate(_feature: string): boolean {
  return true;
}
