/**
 * useStableCallback — returns a stable function reference that always calls
 * the latest version of `fn`. Equivalent to useEvent (RFC proposal).
 *
 * Use this instead of useCallback when:
 *   - The callback is passed to a memoized child
 *   - The callback depends on values that change often (but you don't want
 *     the child to re-render every time those values change)
 *
 * @example
 *   // Without: handleClick recreated on every render because it captures `count`
 *   const handleClick = useCallback(() => doSomething(count), [count]);
 *
 *   // With: stable reference, always sees latest `count`, no re-renders
 *   const handleClick = useStableCallback(() => doSomething(count));
 */
import { useRef, useCallback, useEffect } from "react";

export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const fnRef = useRef(fn);

  // Always keep ref current without triggering re-renders or re-subscriptions
  useEffect(() => { fnRef.current = fn; });

  // Return a stable wrapper that delegates to the ref
  return useCallback((...args: Parameters<T>) => fnRef.current(...args), []) as T;
}
