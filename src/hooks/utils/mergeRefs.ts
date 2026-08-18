import type React from 'react';

/**
 * Merge an array of refs into a single callback ref.
 * Handles callback refs (functions), object refs (React.createRef / useRef),
 * and skips null/undefined entries.
 *
 * @param refs - Array of refs to merge.
 * @returns A callback ref that assigns the value to every ref in the array.
 */
export function mergeRefs<T>(
  refs: Array<React.Ref<T> | React.MutableRefObject<T> | null | undefined>,
): (value: T) => void {
  return (value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref) {
        (ref as React.MutableRefObject<T>).current = value;
      }
    });
  };
}
