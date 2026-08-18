import React from 'react';

/**
 * A wrapper around React.lazy that handles both standard `{ default: Component }`
 * imports and direct component exports (where the module doesn't wrap in `{ default }`).
 *
 * Normalizes the import so React.lazy always receives a `{ default: T }` object.
 *
 * @param importFn - A function returning a promise that resolves to either
 *   `{ default: Component }` or the component itself.
 * @returns A React.LazyExoticComponent wrapping the resolved component.
 */
export function lazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T } | T>,
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const mod = await importFn();
    if (mod !== null && typeof mod === 'object' && 'default' in mod) {
      return mod as { default: T };
    }
    return { default: mod as T };
  });
}
