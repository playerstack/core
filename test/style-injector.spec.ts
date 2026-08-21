import { adoptPlayerstackStyles, ensureGlobalTokens, getSharedStyleSheet } from '@styles/style-injector';
import { compileTokensToCss } from '@styles/token-css';
import { DESIGN_TOKENS } from '@styles/tokens';

/**
 * Example/edge specs for Style_Auto_Injection that complement the idempotence PBT
 * (style-injector.pbt.spec.ts):
 *
 *  - The `<style>` FALLBACK branch of `adoptPlayerstackStyles`, exercised when
 *    constructable stylesheets (`CSSStyleSheet.prototype.replaceSync`) are NOT
 *    supported — which is the DEFAULT in this jsdom environment (Req 3.7, 3.8).
 *  - `ensureGlobalTokens` injecting the global `:root` tokens block (Req 3.10).
 *  - A deterministic snapshot of `compileTokensToCss(DESIGN_TOKENS)` in both the
 *    default `:root` and `:host` selectors (Req 17.5), locking the compiled CSS.
 *
 * IMPORTANT: this file deliberately does NOT polyfill `replaceSync`. Jest isolates
 * modules per test file, and jsdom here lacks `replaceSync`, so the injector takes
 * the guarded `<style data-playerstack-styles>` fallback path — exactly the branch
 * this spec is meant to cover. We still feature-detect at runtime and branch so the
 * suite stays correct if a future environment DOES support constructable sheets.
 */

const SUPPORTS_CONSTRUCTABLE = typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype;

/** Removes any injected global-tokens marker so document state never leaks between tests. */
function clearGlobalTokens(): void {
  document.head.querySelectorAll('style[data-playerstack-tokens]').forEach((el) => {
    el.remove();
  });
}

describe('adoptPlayerstackStyles', () => {
  if (!SUPPORTS_CONSTRUCTABLE) {
    // FALLBACK branch (expected in this jsdom env): a guarded <style> is appended
    // to the shadow root instead of adopting a constructable sheet (Req 3.7, 3.8).
    describe('<style> fallback (constructable stylesheets unsupported)', () => {
      it('appends a single <style data-playerstack-styles> carrying the Style_Layer CSS', () => {
        const host = document.createElement('div');
        const root = host.attachShadow({ mode: 'open' });

        adoptPlayerstackStyles(root);

        const styles = root.querySelectorAll('style[data-playerstack-styles]');
        expect(styles).toHaveLength(1);

        const css = styles[0].textContent ?? '';
        // Base Style_Layer rules from playerstack.css are present...
        expect(css).toContain(':host');
        // ...and the :host token block compiled from the Design_Tokens is appended.
        expect(css).toContain('--playerstack-color-accent');
        expect(css).toContain(':host {');
      });

      it('is idempotent: N calls still yield exactly ONE fallback <style>', () => {
        const host = document.createElement('div');
        const root = host.attachShadow({ mode: 'open' });

        adoptPlayerstackStyles(root);
        adoptPlayerstackStyles(root);
        adoptPlayerstackStyles(root);

        expect(root.querySelectorAll('style[data-playerstack-styles]')).toHaveLength(1);
      });
    });
  } else {
    // ADOPTED branch: only reachable if the environment gains constructable sheets.
    describe('adoptedStyleSheets (constructable stylesheets supported)', () => {
      it('adopts the shared sheet exactly once across repeated calls', () => {
        const shared = getSharedStyleSheet();
        const host = document.createElement('div');
        const root = host.attachShadow({ mode: 'open' });

        adoptPlayerstackStyles(root);
        adoptPlayerstackStyles(root);

        const occurrences = root.adoptedStyleSheets.filter((sheet) => sheet === shared).length;
        expect(occurrences).toBe(1);
      });
    });
  }
});

describe('ensureGlobalTokens', () => {
  beforeEach(() => {
    clearGlobalTokens();
  });

  afterAll(() => {
    clearGlobalTokens();
  });

  it('injects a single :root tokens block into the document head', () => {
    ensureGlobalTokens(document);

    const markers = document.head.querySelectorAll('style[data-playerstack-tokens]');
    expect(markers).toHaveLength(1);

    const css = markers[0].textContent ?? '';
    expect(css.startsWith(':root {')).toBe(true);
    expect(css).toContain('--playerstack-color-accent');
    expect(css).toContain('--playerstack-space-md');
    expect(css).toContain('--playerstack-radius-full');
  });

  it('is idempotent: N calls still yield exactly ONE tokens block', () => {
    ensureGlobalTokens(document);
    ensureGlobalTokens(document);
    ensureGlobalTokens(document);

    expect(document.head.querySelectorAll('style[data-playerstack-tokens]')).toHaveLength(1);
  });
});

describe('compileTokensToCss snapshot', () => {
  it('compiles the default Design_Tokens under :root (locked snapshot)', () => {
    expect(compileTokensToCss(DESIGN_TOKENS)).toMatchSnapshot();
  });

  it('compiles the default Design_Tokens under :host (locked snapshot)', () => {
    expect(compileTokensToCss(DESIGN_TOKENS, ':host')).toMatchSnapshot();
  });
});
