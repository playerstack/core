/**
 * `PlayerstackElement` — the abstract base class for every `playerstack-*` Custom Element
 * (the UI_Layer). It centralizes the shared machinery so individual UI_Elements only
 * describe their attribute schema and their render output (Req 1.1, 1.5, 2.1, 3.3, 3.7).
 *
 * WHY a single base class
 *   Media Chrome and Vidstack both share a base element for the exact reasons captured
 *   here: uniform Shadow DOM setup, `observedAttributes` derived from a declarative
 *   schema, prop<->attribute reflection through the pure helpers, media-context wiring,
 *   and deterministic teardown. Subclasses stay tiny and never re-implement lifecycle
 *   plumbing.
 *
 * Responsibilities:
 *   - Attach an open Shadow DOM in the constructor so `part`s are stylable and
 *     `--playerstack-*` custom properties inherit across the boundary.
 *   - Derive `observedAttributes` from the static `attributeSchema` (Req 1.1).
 *   - On connect: apply the Style_Layer via Style_Auto_Injection (Req 3.7), request the
 *     shared media context and subscribe to its store, then render.
 *   - On disconnect: run every registered disposer so listeners/subscriptions are cleaned
 *     up deterministically.
 *   - Convert changed attributes back to prop values respecting the declared `type`
 *     (Req 7.2) and expose a `dispatchRequest` helper that emits bubbling + composed
 *     request events (Req 2.1).
 *   - Reflect state to `data-*` on the host through a protected `reflectState` helper
 *     (Req 3.3); the default `onStoreChange` is a no-op subclasses override.
 */
import type { AttributeSchema, MediaContextConsumer } from '@typings/ui/playerstack-element.types';
import type { MediaStoreState, MediaStore } from '@typings/ui/media-store.types';
import type { ReflectableState } from '@typings/styles/state-attributes.types';
import { attributeToProp } from '@ui/attribute-reflect';
import { requestMediaContext } from '@ui/media-context';
import { adoptPlayerstackStyles } from '@styles/style-injector';
import { reflectStateToAttributes } from '@styles/state-attributes';

export abstract class PlayerstackElement extends HTMLElement implements MediaContextConsumer {
  /**
   * Declarative attribute schema. Subclasses override it to declare the attributes they
   * observe and how each maps back to a prop value. Empty by default so a subclass that
   * needs no attributes works without extra boilerplate.
   */
  static attributeSchema: AttributeSchema = {};

  /**
   * `observedAttributes` derived from `attributeSchema` so the schema is the single
   * source of truth (Req 1.1). Access the schema via `this` (the concrete subclass
   * constructor) so each subclass sees its own overridden schema, not the base one.
   */
  static get observedAttributes(): string[] {
    const schema = (this as typeof PlayerstackElement).attributeSchema;
    return Object.keys(schema).map((propKey) => schema[propKey]?.attribute ?? propKey);
  }

  /** Open shadow root that hosts this element's rendered markup and adopted styles. */
  protected root: ShadowRoot;

  /**
   * The shared reactive store, obtained from the media context on connect. `null` until
   * a provider responds (or when connected outside a `playerstack-media-controller`).
   */
  private _store: MediaStore | null = null;

  /**
   * Teardown callbacks (store unsubscribe, event listeners) run on disconnect so the
   * element leaves no dangling subscriptions (deterministic cleanup).
   */
  private _disposers: Array<() => void> = [];

  constructor() {
    super();
    // Open mode keeps `part`s stylable from outside and lets `--playerstack-*` custom
    // properties inherit through the shadow boundary for theming (Req 3.5).
    this.root = this.attachShadow({ mode: 'open' });
  }

  /**
   * Applies the Style_Layer (Req 3.7), requests the shared media context and subscribes
   * to its store, then renders. Runs each time the element is connected; `addDisposer`
   * keeps the subscription paired with `disconnectedCallback` so reconnects are clean.
   */
  connectedCallback(): void {
    // Style_Auto_Injection: adopt the shared sheet into this shadow root (idempotent).
    adoptPlayerstackStyles(this.root);

    // Ask the nearest provider for the shared context. If none responds synchronously the
    // callback simply never runs and the element retries on its next connect.
    requestMediaContext(this, (context) => {
      this._store = context.store;
      const unsubscribe = context.store.subscribe((state) => this.onStoreChange(state));
      this.addDisposer(unsubscribe);
    });

    this.render();
  }

  /**
   * Runs every registered disposer and clears the list so a subsequent reconnect starts
   * from a clean slate without double-unsubscribing.
   */
  disconnectedCallback(): void {
    for (const dispose of this._disposers) {
      dispose();
    }
    this._disposers = [];
    this._store = null;
  }

  /**
   * Converts a changed attribute back to its prop value respecting the declared `type`
   * (Req 7.2), then hands it to the overridable `onAttributeChanged` hook. Kept minimal:
   * the base class only performs the type-correct conversion; subclasses decide how to
   * react (e.g. re-render).
   */
  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    const schema = (this.constructor as typeof PlayerstackElement).attributeSchema;
    // Find the prop key whose entry declares this attribute name (falling back to a key
    // that equals the attribute name). Guard indexing for `noUncheckedIndexedAccess`.
    const propKey = Object.keys(schema).find((key) => (schema[key]?.attribute ?? key) === name);
    if (propKey === undefined) {
      return;
    }
    const entry = schema[propKey];
    if (entry === undefined) {
      return;
    }
    const propValue = attributeToProp(value, entry.type);
    this.onAttributeChanged(propKey, propValue);
  }

  /**
   * Hook invoked with the converted prop key/value after an observed attribute changes.
   * No-op by default; subclasses override to react (e.g. update internal state or
   * re-render).
   */
  protected onAttributeChanged(_propKey: string, _value: string | number | boolean): void {
    // Intentionally empty: subclasses override to react to attribute changes.
  }

  /**
   * Invoked with the latest store state on every change. No-op by default so subclasses
   * opt in to reflecting exactly the subset of state they care about (per design), which
   * avoids reflecting every `PlayerState` key onto the host.
   */
  onStoreChange(_state: Readonly<MediaStoreState>): void {
    // Intentionally empty: subclasses override to reflect the state they need.
  }

  /**
   * Reflects a subset of state to `data-*` attributes on the host (Req 3.3). Applies the
   * pure `reflectStateToAttributes` and then sets or removes each host attribute: a
   * `null` reflected value removes the attribute, any other value sets it. Provided so
   * subclasses can reflect their chosen state from `onStoreChange`.
   */
  protected reflectState(partial: Readonly<ReflectableState>): void {
    const attributes = reflectStateToAttributes(partial);
    for (const attribute of Object.keys(attributes)) {
      const value = attributes[attribute as keyof typeof attributes];
      if (value === null || value === undefined) {
        this.removeAttribute(attribute);
      } else {
        this.setAttribute(attribute, value);
      }
    }
  }

  /**
   * Registers a teardown callback run on disconnect. Used for store unsubscribes and any
   * DOM listeners a subclass adds, keeping cleanup deterministic.
   */
  protected addDisposer(fn: () => void): void {
    this._disposers.push(fn);
  }

  /**
   * Emits a request event expressing user intent without touching the media element
   * directly (Req 2.1). `bubbles` + `composed` let the event climb out of the shadow root
   * to the `MediaController` on the root host.
   */
  protected dispatchRequest<D>(type: string, detail?: D): void {
    this.dispatchEvent(new CustomEvent<D>(type, { detail, bubbles: true, composed: true }));
  }

  /**
   * The shared media store once the context has been resolved, or `null` before a
   * provider responds. Read-only accessor for subclasses.
   */
  protected get store(): MediaStore | null {
    return this._store;
  }

  /**
   * Renders the element's shadow DOM markup. Implemented by each concrete UI_Element.
   */
  protected abstract render(): void;
}
