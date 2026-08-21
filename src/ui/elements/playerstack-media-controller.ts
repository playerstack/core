/**
 * `playerstack-media-controller` — the ROOT host Custom Element of a Playerstack player
 * (Req 1.1, 5.1, 5.3). It is the single element a consumer places at the top of the tree;
 * every other `playerstack-*` element composes inside it via its light-DOM `<slot>`.
 *
 * Responsibilities of the root host:
 *   - Own the shared reactive `MediaStore` and PROVIDE it as the media context so every
 *     descendant resolves the same store WITHOUT holding a direct reference (Req 2.2, 2.3).
 *   - Inject the global `:root { --playerstack-* }` Design_Tokens exactly once per document
 *     via `ensureGlobalTokens` (Req 3.10) so tokens are available even outside shadow roots.
 *   - Expose a stable Markup_Contract of Shadow DOM `part`s plus a `<slot>` so Skins can
 *     style the structure and children render in the light DOM (Req 5.1, 5.3).
 *   - Optionally host a `MediaController` (adapter + orchestrator wiring) attached later by
 *     the Vanilla_Build / framework adapter layer (Req 1.6, 2.2, 2.3); it stays optional so
 *     the element works standalone (e.g. in tests) with only the store + context.
 *
 * WHY it overrides `connectedCallback`: unlike leaf UI_Elements (which only CONSUME the
 * context), the root host must CREATE and PROVIDE the store before descendants request it.
 * The store is created and provided first, then `ensureGlobalTokens` runs, then
 * `super.connectedCallback()` adopts the Style_Layer + renders. `super`'s own
 * `requestMediaContext` finds no ancestor provider (this IS the provider) and is harmless.
 */
import type { AttachControllerParams } from '@typings/ui/playerstack-media-controller.types';
import { PlayerstackElement } from '@ui/playerstack-element';
import { createMediaStore } from '@ui/media-store';
import { provideMediaContext } from '@ui/media-context';
import { MediaController } from '@ui/media-controller';
import { ensureGlobalTokens } from '@styles/style-injector';

export class PlayerstackMediaController extends PlayerstackElement {
  /**
   * The shared reactive store this host owns and provides to descendants. Created lazily on
   * first connect and reused across reconnects so the context identity stays stable.
   */
  private mediaStore = createMediaStore();

  /**
   * The optional controller wiring adapter + orchestrator into the store. `null` until
   * `attachController` is called by the adapter layer; destroyed on disconnect.
   */
  private controller: MediaController | null = null;

  /**
   * Creates + provides the media context, injects the global tokens, then defers to the
   * base class to adopt styles and render. Ordering matters: provide BEFORE `super` so a
   * descendant added in the same tick resolves the context, and append (never clobber) so
   * the base class's adopted Style_Layer / fallback `<style>` is preserved (see `render`).
   */
  override connectedCallback(): void {
    // Provide the shared context first so descendants that request it resolve immediately.
    const unprovide = provideMediaContext(this, { store: this.mediaStore });
    this.addDisposer(unprovide);

    // Req 3.10: inject the global `:root` tokens exactly once per document (idempotent).
    ensureGlobalTokens();

    // Base class: adopt the Style_Layer into this shadow root, (harmlessly) request context,
    // and invoke `render`. Runs LAST so styles are adopted before `render` appends markup.
    super.connectedCallback();
  }

  /**
   * Destroys the hosted controller (if any) before running the base class teardown so no
   * request/orchestrator listeners or timers leak, then defers to `super` to run disposers.
   */
  override disconnectedCallback(): void {
    if (this.controller !== null) {
      this.controller.destroy();
      this.controller = null;
    }
    super.disconnectedCallback();
  }

  /**
   * Attaches a `MediaController` that wires `adapter` (request events → media I/O) and
   * `orchestrator` (playback events → store) to THIS host's store and root target
   * (Req 1.6, 2.2, 2.3). Optional and defensive: destroys any previously attached
   * controller first so repeated attaches never leak listeners.
   */
  attachController({ adapter, orchestrator }: AttachControllerParams): void {
    if (this.controller !== null) {
      this.controller.destroy();
    }
    this.controller = new MediaController({
      adapter,
      store: this.mediaStore,
      rootTarget: this,
      orchestrator,
    });
  }

  /**
   * The shared reactive store this host provides. Read-only accessor so the adapter layer
   * (or tests) can observe the exact store descendants subscribe to.
   */
  get store(): ReturnType<typeof createMediaStore> {
    return this.mediaStore;
  }

  /**
   * Renders the Markup_Contract: a `part="root"` container holding a `part="media"` region
   * and a `part="controls"` region that carries the `<slot>` so light-DOM `playerstack-*`
   * children compose inside the host (Req 5.1, 5.3).
   *
   * WHY nodes are APPENDED (not `this.root.innerHTML = ...`): the base class adopts the
   * Style_Layer BEFORE calling `render`; in the fallback path that means an injected
   * `<style data-playerstack-styles>` already lives in the shadow root. Clobbering
   * `innerHTML` would wipe it. Building the structure with `createElement`/`appendChild`
   * preserves the adopted styles. The guard keeps `render` idempotent across reconnects.
   */
  protected render(): void {
    // Idempotent: if the root structure is already present (reconnect), don't duplicate it.
    if (this.root.querySelector('[part="root"]') !== null) {
      return;
    }

    const root = document.createElement('div');
    root.setAttribute('part', 'root');

    const media = document.createElement('div');
    media.setAttribute('part', 'media');

    const controls = document.createElement('div');
    controls.setAttribute('part', 'controls');

    // The slot lets light-DOM children (other `playerstack-*` elements) render inside the host.
    const slot = document.createElement('slot');
    controls.appendChild(slot);

    root.appendChild(media);
    root.appendChild(controls);

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(root);
  }
}
