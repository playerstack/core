import { useRef } from 'react';
import isEqual from 'react-fast-compare';

/**
 * Returns a referentially stable version of a value that only changes its
 * identity when the value's deep content changes.
 *
 * Useful when a prop is an object/array that the consumer recreates on every
 * render (e.g. an inline array), which would otherwise invalidate downstream
 * `useMemo`/`useEffect` dependencies on every render.
 *
 * Performs a single deep comparison per render, then lets all downstream hooks
 * rely on cheap reference equality.
 *
 * @param value - The value to stabilize.
 * @returns A reference that is stable across renders while the content is equal.
 * @example const stableSources = useDeepCompareMemoize(sources);
 */
export function useDeepCompareMemoize<T>(value: T): T {
  const ref = useRef<T>(value);

  if (!isEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
}
