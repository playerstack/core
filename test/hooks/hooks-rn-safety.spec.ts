/**
 * RN-safety smoke test for the hooks subpath.
 * Runs in Node environment (no jsdom) — browser globals must not be available.
 */
describe('@playerstack/core/hooks RN-safety', () => {
  it('runs with window and document undefined', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('does not have browser-specific navigator properties', () => {
    // Node 21+ exposes a minimal navigator, but it lacks browser APIs
    // that hooks must not depend on (userAgent, mediaSession, etc.)
    if (typeof navigator !== 'undefined') {
      expect((navigator as any).mediaSession).toBeUndefined();
    } else {
      expect(typeof navigator).toBe('undefined');
    }
  });

  it('imports the hooks barrel without error', async () => {
    const hooks = await import('../../src/hooks/index');
    expect(hooks).toBeDefined();
  });
});
