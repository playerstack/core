/**
 * Smoke test: verifies that all DOM-free subpaths can be imported in a Node
 * environment (no jsdom, no browser globals) without throwing.
 *
 * This test runs in the 'hooks' project (testEnvironment: 'node') which
 * guarantees window/document/navigator are undefined.
 */
describe('DOM-free subpath imports (Node environment)', () => {
  it('confirms browser globals are not available', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('imports ./utils/format without error', async () => {
    const mod = await import('../../src/utils/format');
    expect(mod).toBeDefined();
  });

  it('imports ./i18n without error', async () => {
    const mod = await import('../../src/i18n/index');
    expect(mod).toBeDefined();
  });

  it('imports ./chapters without error', async () => {
    const mod = await import('../../src/chapters');
    expect(mod).toBeDefined();
  });

  it('imports ./heatmap without error', async () => {
    const mod = await import('../../src/heatmap');
    expect(mod).toBeDefined();
  });

  it('imports ./keyboard without error', async () => {
    const mod = await import('../../src/keyboard');
    expect(mod).toBeDefined();
  });

  it('imports ./player-state without error', async () => {
    const mod = await import('../../src/player-state');
    expect(mod).toBeDefined();
  });

  it('imports ./slider without error', async () => {
    const mod = await import('../../src/slider');
    expect(mod).toBeDefined();
  });

  it('imports ./reducer without error', async () => {
    const mod = await import('../../src/reducer');
    expect(mod).toBeDefined();
  });

  it('imports ./ui without error', async () => {
    const mod = await import('../../src/ui');
    expect(mod).toBeDefined();
  });

  it('imports ./patterns without error', async () => {
    const mod = await import('../../src/patterns');
    expect(mod).toBeDefined();
  });

  it('imports ./utils/env without error', async () => {
    const mod = await import('../../src/utils/env');
    expect(mod).toBeDefined();
  });

  it('imports ./utils/captions without error', async () => {
    const mod = await import('../../src/utils/captions');
    expect(mod).toBeDefined();
  });

  it('imports ./utils/vtt-sprite without error', async () => {
    const mod = await import('../../src/utils/vtt-sprite');
    expect(mod).toBeDefined();
  });

  it('imports ./adapters without error', async () => {
    const mod = await import('../../src/types/adapters.types');
    expect(mod).toBeDefined();
  });
});
