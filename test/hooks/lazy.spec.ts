import React from 'react';
import { lazy } from '../../src/hooks/utils/lazy';

const DummyComponent: React.FC<{ text?: string }> = ({ text = 'Hello' }) => {
  return React.createElement('div', null, text);
};

describe('lazy', () => {
  it('returns a React.LazyExoticComponent for { default: Component }', () => {
    const LazyComp = lazy(() => Promise.resolve({ default: DummyComponent }));

    expect(LazyComp).toBeDefined();
    expect((LazyComp as any).$$typeof).toBeDefined();
  });

  it('returns a React.LazyExoticComponent for direct component export', () => {
    const LazyComp = lazy(() => Promise.resolve(DummyComponent));

    expect(LazyComp).toBeDefined();
    expect((LazyComp as any).$$typeof).toBeDefined();
  });

  it('wraps the import function so React.lazy can resolve it', () => {
    const importFn = jest.fn(() => Promise.resolve({ default: DummyComponent }));
    const LazyComp = lazy(importFn);

    // The lazy wrapper creates a React.lazy; it doesn't call importFn until render
    expect(LazyComp).toBeDefined();
    expect((LazyComp as any).$$typeof).toBeDefined();
  });
});
