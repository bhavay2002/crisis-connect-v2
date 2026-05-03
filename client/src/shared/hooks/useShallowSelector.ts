/**
 * useShallowSelector — convenience wrapper for Zustand stores that selects
 * multiple fields at once with shallow comparison.
 *
 * Without this, selecting multiple fields triggers re-renders whenever ANY
 * part of the store changes, even unrelated fields.
 *
 * @example
 *   // Before (re-renders on any store change):
 *   const data = useMyStore(s => ({ a: s.a, b: s.b }));
 *
 *   // After (only re-renders when a or b changes):
 *   const { a, b } = useShallowSelector(useMyStore, s => ({ a: s.a, b: s.b }));
 */
import { useShallow } from "zustand/react/shallow";
import type { StoreApi, UseBoundStore } from "zustand";

export function useShallowSelector<S, T extends object>(
  useStore: UseBoundStore<StoreApi<S>>,
  selector: (state: S) => T
): T {
  return useStore(useShallow(selector));
}
