/**
 * Style_Auto_Injection — the concrete mechanism that makes every PlayerStack UI_Element
 * apply its Style_Layer automatically when it connects to the DOM, without the consumer
 * importing any CSS (Req 3.7-3.10).
 *
 * WHY a single shared sheet
 *   The Style_Layer text is identical for every UI_Element, so we build ONE
 *   `CSSStyleSheet` singleton (memoized at module level) and adopt that same instance
 *   into every shadow root. N instances therefore share the SAME sheet — the injected
 *   CSS is never duplicated (Req 3.8, Property 6 / Req 20.6).
 *
 * WHY the injection is idempotent
 *   `adoptPlayerstackStyles` pushes the shared sheet only when it is not already present
 *   in `adoptedStyleSheets`, and `ensureGlobalTokens` guards the global `:root` tokens
 *   with a marker element so N calls yield exactly one injection.
 *
 * WHY a fallback path
 *   Environments without constructable stylesheets (`adoptedStyleSheets` /
 *   `CSSStyleSheet.prototype.replaceSync`) get a guarded `<style>` element injected into
 *   the shadow root instead, preserving the same idempotence contract.
 */
import type { StyleInjectionTarget } from '@typings/styles/style-injector.types';
import { compileTokensToCss } from '@styles/token-css';
import { DESIGN_TOKENS } from '@styles/tokens';
import playerstackCssText from '@styles/playerstack.css';

/**
 * Marker attribute used to guard the `<style>` fallback inside a shadow root so a given
 * root only ever receives one PlayerStack style element.
 */
const SHADOW_STYLE_MARKER = 'data-playerstack-styles';

/**
 * Marker attribute used to guard the single global tokens `<style>` per document so the
 * `:root { --playerstack-* }` block is injected exactly once (Req 3.10).
 */
const GLOBAL_TOKENS_MARKER = 'data-playerstack-tokens';

/**
 * Module-level singleton of the shared Style_Layer sheet. Built lazily on first use and
 * reused by every subsequent call so all shadow roots adopt the SAME instance (Req 3.8).
 */
let sharedSheet: CSSStyleSheet | null = null;

/**
 * Builds the full Style_Layer text: the standard `playerstack.css` plus the Design_Tokens
 * compiled against `:host` so the `--playerstack-*` custom properties are available inside
 * every shadow root (Req 4.2). Kept as a helper so both the constructable sheet and the
 * `<style>` fallback share exactly the same text.
 */
function buildStyleLayerText(): string {
  return `${playerstackCssText}\n${compileTokensToCss(DESIGN_TOKENS, ':host')}`;
}

/**
 * Feature-detects support for constructable stylesheets. We require both the
 * `CSSStyleSheet` constructor with `replaceSync` (to build the sheet) and, at the call
 * site, a target that exposes an `adoptedStyleSheets` array.
 */
function supportsConstructableStyleSheets(): boolean {
  return typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype;
}

/**
 * Returns the ONE shared `CSSStyleSheet` for the Style_Layer, building it on first call
 * and memoizing it at module level (Req 3.8, 20.6). Subsequent calls return the SAME
 * instance.
 *
 * `cssText` is accepted primarily for testing; when omitted the default combined
 * Style_Layer text (`playerstack.css` + `:host` tokens) is used.
 */
export function getSharedStyleSheet(cssText?: string): CSSStyleSheet {
  if (sharedSheet === null) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText ?? buildStyleLayerText());
    sharedSheet = sheet;
  }
  return sharedSheet;
}

/**
 * Injects the Style_Layer as a guarded `<style>` element into a shadow root. Used only
 * when constructable stylesheets are unsupported. The marker attribute keeps it
 * idempotent: a root that already carries the marker is left untouched.
 */
function adoptViaStyleElement(root: ShadowRoot): void {
  if (root.querySelector(`style[${SHADOW_STYLE_MARKER}]`) !== null) {
    return;
  }
  const style = document.createElement('style');
  style.setAttribute(SHADOW_STYLE_MARKER, '');
  style.textContent = buildStyleLayerText();
  root.appendChild(style);
}

/**
 * Adopts the shared Style_Layer sheet into `root.adoptedStyleSheets`, but only if it is
 * not already present, so N calls leave the sheet present exactly once (idempotent,
 * Req 3.7/3.8). Invoked by `PlayerstackElement.connectedCallback`.
 *
 * When constructable stylesheets are unavailable, falls back to a guarded `<style>`
 * element inside the shadow root (only possible when the target is a real `ShadowRoot`).
 */
export function adoptPlayerstackStyles(root: StyleInjectionTarget): void {
  if (supportsConstructableStyleSheets()) {
    const sheet = getSharedStyleSheet();
    if (!root.adoptedStyleSheets.includes(sheet)) {
      // Reassign (rather than mutate) so environments that expose a frozen array still work.
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    }
    return;
  }

  // Fallback: only a real ShadowRoot can host a <style> element.
  if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) {
    adoptViaStyleElement(root);
  }
}

/**
 * Injects the global `:root { --playerstack-* }` custom properties into a document
 * exactly once (Req 3.10). A guarded `<style data-playerstack-tokens>` element in the
 * document head acts as the marker, so N calls produce exactly ONE injection.
 *
 * `doc` defaults to the ambient `document`; it is a parameter so tests can pass a fake.
 */
export function ensureGlobalTokens(doc: Document = document): void {
  if (doc.querySelector(`style[${GLOBAL_TOKENS_MARKER}]`) !== null) {
    return;
  }
  const style = doc.createElement('style');
  style.setAttribute(GLOBAL_TOKENS_MARKER, '');
  style.textContent = compileTokensToCss(DESIGN_TOKENS, ':root');
  (doc.head ?? doc.documentElement).appendChild(style);
}
