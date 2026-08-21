/**
 * `playerstack-context-menu` — the right-click menu offering loop / Picture-in-Picture /
 * fullscreen actions (Req 1.4, 1.6, 3.3, 5.1, 5.3).
 *
 * As an interactive UI_Element it follows the Request/Response model: it NEVER touches the
 * media element, the Picture-in-Picture API, or the Fullscreen API directly. Selecting an
 * item only expresses intent via bubbling + composed request events that the
 * `MediaController` / a capable adapter fulfils (Req 2.1):
 *   - loop → `playerstack-loop-request` (`detail: { loop }`) — a custom, adapter-extensible
 *     event carrying the NEXT loop state, since the defined core request vocabulary has no
 *     loop entry.
 *   - PiP → `playerstack-enter-pip-request` / `playerstack-exit-pip-request` (matching
 *     `playerstack-pip-button`).
 *   - fullscreen → `playerstack-enter-fullscreen-request` /
 *     `playerstack-exit-fullscreen-request` (matching `playerstack-fullscreen-button`).
 *
 * WHY requests instead of mutating the DOM: dispatching requests keeps the element adapter-
 * extensible and consistent with the rest of the UI_Layer. `UIController` (the Core UI state
 * controller) only owns auto-hide/lock/settings visibility — it exposes NO loop/PiP/
 * fullscreen decision logic — so the current loop/PiP/fullscreen values are read from the
 * shared store, and the element decides "which request" from that state.
 *
 * The menu opens on `contextmenu` (right-click) at the pointer position and closes on any
 * document click, on `Escape`, or on the next `contextmenu`. Its open state is reflected as
 * `data-open` on the host (Req 3.3) so the Style_Layer can show/hide the menu through
 * `:host([data-open]) [part='context-menu']`. Each item mirrors the active loop/PiP/
 * fullscreen state via `data-loop`/`data-pip`/`data-fullscreen` so the Style_Layer can render
 * active markers. All listeners are registered with cleanup via `addDisposer`.
 */
import type {
  ContextMenuAction,
  ContextMenuDefaultLabels,
  ContextMenuI18n,
} from '@typings/ui/playerstack-context-menu.types';
import type { MediaStoreState } from '@typings/ui/media-store.types';
import { PlayerstackElement } from '@ui/playerstack-element';

/** Default English labels applied when the consumer provides no i18n override (Req 1.5). */
const DEFAULT_LABELS: ContextMenuDefaultLabels = {
  loop: 'Loop',
  pip: 'Picture in Picture',
  fullscreen: 'Fullscreen',
};

/** The action rows the menu renders, in display order. */
const ACTIONS: readonly ContextMenuAction[] = ['loop', 'pip', 'fullscreen'];

export class PlayerstackContextMenu extends PlayerstackElement {
  /**
   * Optional per-action label overrides; defaults to `null` so the English defaults apply.
   * Setting it re-renders the item labels so translations apply immediately.
   */
  private _i18n: ContextMenuI18n | null = null;

  /** Latest loop state mirrored from the store; decides the loop request payload + marker. */
  private loop = false;

  /** Latest PiP state mirrored from the store; decides the enter/exit PiP request + marker. */
  private pip = false;

  /** Latest fullscreen state mirrored from the store; decides enter/exit + marker. */
  private fullscreen = false;

  /** Whether the menu is currently open; reflected as `data-open` on the host (Req 3.3). */
  private open = false;

  /** The rendered menu container; kept so `render` stays idempotent across reconnects. */
  private menu: HTMLElement | null = null;

  /** The rendered action items keyed by action so store changes can re-mark active state. */
  private items: Partial<Record<ContextMenuAction, HTMLButtonElement>> = {};

  /**
   * Public setter for the minimal i18n label bag. Re-renders the item labels so translated
   * labels apply immediately; passing `null` restores the English defaults.
   */
  set i18n(value: ContextMenuI18n | null) {
    this._i18n = value;
    this.applyLabels();
  }

  get i18n(): ContextMenuI18n | null {
    return this._i18n;
  }

  /**
   * Tracks the loop/PiP/fullscreen state this element cares about so each item's request
   * decision and active marker stay correct (Req 3.3). Only the fields needed are read, per
   * the base class's opt-in `onStoreChange` design.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    this.loop = state.loop;
    this.pip = state.isPIP;
    this.fullscreen = state.isFullScreen;
    this.reflectState({ loop: state.loop, pip: state.isPIP, fullscreen: state.isFullScreen });
    this.markActiveItems();
  }

  /**
   * Resolves the label for an action: the consumer i18n override takes precedence, then the
   * English default. Returned as a plain string used as the item's text content.
   */
  private resolveLabel(action: ContextMenuAction): string {
    return this._i18n?.[action] ?? DEFAULT_LABELS[action];
  }

  /**
   * Opens the menu at the pointer position (Req 3.3). The `contextmenu` default (the browser's
   * native menu) is prevented so the player's menu takes over. Position is expressed as
   * `--playerstack-context-menu-x/-y` custom properties on the host so the Style_Layer places
   * the menu without this element hard-coding layout.
   */
  private openAt(event: MouseEvent): void {
    event.preventDefault();
    this.open = true;
    this.style.setProperty('--playerstack-context-menu-x', `${event.clientX}px`);
    this.style.setProperty('--playerstack-context-menu-y', `${event.clientY}px`);
    this.setAttribute('data-open', 'true');
  }

  /** Closes the menu and clears the reflected `data-open` state (Req 3.3). */
  private close(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.removeAttribute('data-open');
  }

  /**
   * Emits the request for a selected action, reading the current state from the store to
   * decide the intent (Req 2.1), then closes the menu so the interaction reads as "pick and
   * dismiss". Loop toggles via a custom `playerstack-loop-request` carrying the NEXT loop
   * value; PiP/fullscreen emit the same enter/exit events their dedicated buttons use.
   */
  private selectAction(action: ContextMenuAction): void {
    if (action === 'loop') {
      this.dispatchRequest('playerstack-loop-request', { loop: !this.loop });
    } else if (action === 'pip') {
      this.dispatchRequest(this.pip ? 'playerstack-exit-pip-request' : 'playerstack-enter-pip-request');
    } else {
      this.dispatchRequest(
        this.fullscreen ? 'playerstack-exit-fullscreen-request' : 'playerstack-enter-fullscreen-request',
      );
    }
    this.close();
  }

  /**
   * Builds the Markup_Contract: a `part="context-menu"` container (hidden by default via the
   * Style_Layer until `data-open`) holding one `part="context-menu-item"` `<button>` per
   * action. Nodes are created and APPENDED (never via `innerHTML`) so the adopted Style_Layer
   * — in the fallback path an injected `<style>` — is preserved. Right-click and document
   * click/Escape listeners are registered with matching disposers. A guard keeps `render`
   * idempotent across reconnects.
   */
  protected render(): void {
    if (this.menu !== null) {
      return;
    }

    const menu = document.createElement('div');
    menu.setAttribute('part', 'context-menu');
    menu.setAttribute('role', 'menu');

    for (const action of ACTIONS) {
      const item = document.createElement('button');
      item.setAttribute('type', 'button');
      item.setAttribute('part', 'context-menu-item');
      item.setAttribute('role', 'menuitem');
      item.setAttribute('data-action', action);
      item.textContent = this.resolveLabel(action);

      const onItemClick = (): void => this.selectAction(action);
      item.addEventListener('click', onItemClick);
      this.addDisposer(() => item.removeEventListener('click', onItemClick));

      this.items[action] = item;
      menu.appendChild(item);
    }

    this.menu = menu;
    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(menu);

    // Open on right-click over the host; close on outside click / Escape / next right-click.
    const onContextMenu = (event: MouseEvent): void => this.openAt(event);
    this.addEventListener('contextmenu', onContextMenu);
    this.addDisposer(() => this.removeEventListener('contextmenu', onContextMenu));

    // A document click anywhere dismisses the menu (including clicks inside it, after the
    // item handler has already run and closed it — the guard in `close` makes that a no-op).
    const onDocumentClick = (): void => this.close();
    document.addEventListener('click', onDocumentClick);
    this.addDisposer(() => document.removeEventListener('click', onDocumentClick));

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    this.addDisposer(() => document.removeEventListener('keydown', onKeyDown));

    // Paint active markers from whatever state the store has already delivered.
    const state = this.store?.getState();
    if (state !== undefined) {
      this.loop = state.loop;
      this.pip = state.isPIP;
      this.fullscreen = state.isFullScreen;
    }
    this.markActiveItems();
  }

  /**
   * Updates each item's label from the resolved i18n after the labels change post-render.
   * No-op before `render` created the items.
   */
  private applyLabels(): void {
    for (const action of ACTIONS) {
      const item = this.items[action];
      if (item !== undefined) {
        item.textContent = this.resolveLabel(action);
      }
    }
  }

  /**
   * Marks each action item with its active state (`data-active`) so the Style_Layer can render
   * an active marker on loop/PiP/fullscreen when currently engaged (Req 3.3). No-op before
   * `render` created the items.
   */
  private markActiveItems(): void {
    const activeByAction: Record<ContextMenuAction, boolean> = {
      loop: this.loop,
      pip: this.pip,
      fullscreen: this.fullscreen,
    };
    for (const action of ACTIONS) {
      const item = this.items[action];
      if (item === undefined) {
        continue;
      }
      if (activeByAction[action]) {
        item.setAttribute('data-active', 'true');
      } else {
        item.removeAttribute('data-active');
      }
    }
  }
}
