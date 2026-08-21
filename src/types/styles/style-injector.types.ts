/**
 * Minimal target the Style_Auto_Injection adopts constructable stylesheets
 * into. Modeled after a `ShadowRoot`/`Document` exposing `adoptedStyleSheets`,
 * kept structural so it can be faked in tests (Req 3.7, 3.8, 20.6).
 */
export interface StyleInjectionTarget {
  /** Constructable stylesheets currently adopted by the target. */
  adoptedStyleSheets: CSSStyleSheet[];
}
