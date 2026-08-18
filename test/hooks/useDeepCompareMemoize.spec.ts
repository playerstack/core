/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useDeepCompareMemoize } from '@hooks/useDeepCompareMemoize';

describe('useDeepCompareMemoize', () => {
  it('returns same reference when content is deeply equal (object)', () => {
    const initial = { a: 1, b: 2 };
    const { result, rerender } = renderHook(({ value }) => useDeepCompareMemoize(value), {
      initialProps: { value: initial },
    });

    const firstRef = result.current;

    // Re-render with a new object that has same content
    rerender({ value: { a: 1, b: 2 } });

    expect(result.current).toBe(firstRef);
  });

  it('returns new reference when content changes (object)', () => {
    const initial = { a: 1, b: 2 };
    const { result, rerender } = renderHook(({ value }) => useDeepCompareMemoize(value), {
      initialProps: { value: initial },
    });

    const firstRef = result.current;

    rerender({ value: { a: 1, b: 3 } });

    expect(result.current).not.toBe(firstRef);
    expect(result.current).toEqual({ a: 1, b: 3 });
  });

  it('returns same reference when array content is deeply equal', () => {
    const initial = [1, 2, 3];
    const { result, rerender } = renderHook(({ value }) => useDeepCompareMemoize(value), {
      initialProps: { value: initial },
    });

    const firstRef = result.current;

    rerender({ value: [1, 2, 3] });

    expect(result.current).toBe(firstRef);
  });

  it('returns new reference when array content changes', () => {
    const initial = [1, 2, 3];
    const { result, rerender } = renderHook(({ value }) => useDeepCompareMemoize(value), {
      initialProps: { value: initial },
    });

    const firstRef = result.current;

    rerender({ value: [1, 2, 4] });

    expect(result.current).not.toBe(firstRef);
    expect(result.current).toEqual([1, 2, 4]);
  });

  it('works with nested structures', () => {
    const initial = { items: [{ id: 1, name: 'a' }], meta: { total: 1 } };
    const { result, rerender } = renderHook(({ value }) => useDeepCompareMemoize(value), {
      initialProps: { value: initial },
    });

    const firstRef = result.current;

    // Same content, new reference
    rerender({ value: { items: [{ id: 1, name: 'a' }], meta: { total: 1 } } });
    expect(result.current).toBe(firstRef);

    // Different nested content
    rerender({ value: { items: [{ id: 1, name: 'b' }], meta: { total: 1 } } });
    expect(result.current).not.toBe(firstRef);
  });

  it('works with primitive values', () => {
    const { result, rerender } = renderHook(({ value }) => useDeepCompareMemoize(value), {
      initialProps: { value: 42 as number },
    });

    expect(result.current).toBe(42);

    // Same primitive
    rerender({ value: 42 });
    expect(result.current).toBe(42);

    // Different primitive
    rerender({ value: 99 });
    expect(result.current).toBe(99);
  });
});
