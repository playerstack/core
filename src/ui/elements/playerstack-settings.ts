/**
 * `playerstack-settings` — the settings control that surfaces playback speed and quality
 * behind a gear button with a two-level menu/submenu (Req 1.4, 1.5, 1.6, 2.1, 3.3, 5.1, 5.3).
 *
 * As an interactive UI_Element it follows the Request/Response model: it NEVER touches the
 * media element or a Controller directly. Selecting a SPEED option only expresses intent via
 * a bubbling + composed `playerstack-rate-request` (`detail: { rate }`) that the
 * `MediaController` routes to the `PlayerAdapter` (Req 2.1). Selecting a QUALITY option emits
 * a custom `playerstack-quality-request` (`detail: { value }`): the defined request set only
 * maps `rate` among settings, so quality is surfaced as a dedicated, adapter-extensible event
 * that a Skin/MediaController can wire later without changing this element.
 *
 * The menu STRUCTURE is built from the SAME pure helper the rest of Core uses,
 * `buildSettingsOptions` (from `@ui-utils`), so the Speed defaults and the Quality entries (plus the
 * trailing `Auto`) match everywhere. Local open/closed UI state mirrors `settingsInitialState`
 * (also from `@ui-utils`) so the "which panel is open" bookkeeping stays consistent with the headless
 * layer. The open state is reflected as `data-open` on the host so the Style_Layer can show/hide
 * the panel through `:host([data-open]) [part='menu']` (Req 3.3).
 *
 * Accessibility (Req 1.5): the rendered `<button>` carries the implicit ARIA `button` role, and
 * its accessible name is configurable through the `aria-label` attribute; when omitted, the
 * default English label applies.
 */
import type { SettingsDefaultLabel, SettingsI18n, SettingsQualityOption } from '@typings/ui/playerstack-settings.types';
import type { SettingsOption } from '@typings/ui.types';
import type { MediaStoreState } from '@typings/ui/media-store.types';
import { PlayerstackElement } from '@ui/playerstack-element';
import { buildSettingsOptions, buildSettingsLabel, settingsInitialState } from '@ui-utils';
import en from '@i18n/en';

/** Default accessible name used when no `aria-label` attribute is provided (Req 1.5). */
const DEFAULT_LABEL: SettingsDefaultLabel = 'Settings';

/** The top-level Speed entry `value` produced by `buildSettingsOptions`. */
const SPEED_KEY = 'speed';

/** The top-level Quality entry `value` produced by `buildSettingsOptions`. */
const QUALITY_KEY = 'quality';

export class PlayerstackSettings extends PlayerstackElement {
  /**
   * Declares `aria-label` as an observed attribute so the settings button's accessible name
   * is configurable via markup (Req 1.5). Keying the schema by `label` while mapping to the
   * `aria-label` attribute keeps the prop name readable and drives `observedAttributes`.
   */
  static override attributeSchema = {
    label: { attribute: 'aria-label', type: 'string' },
  } as const;

  /**
   * Public quality options fed into `buildSettingsOptions`. Defaults to an empty list so the
   * element renders a Speed-only menu until a Skin provides qualities. Setting it re-renders
   * the menu so the new entries appear immediately.
   */
  private _qualityOptions: SettingsQualityOption[] = [];

  /**
   * Minimal i18n bag; defaults to `null` so the element falls back to the English labels from
   * `@i18n`. Setting it re-renders the menu so translated labels apply.
   */
  private _i18n: SettingsI18n | null = null;

  /**
   * Local open/closed UI state mirroring `settingsInitialState` from `@ui-utils`. `generalMenu`
   * tracks whether the main panel is open; `speed`/`quality` track which submenu is open.
   * Captions is unused here (the settings element only owns speed + quality) but kept so the
   * shape matches the shared initial state.
   */
  private uiState: { generalMenu: boolean; speed: boolean; quality: boolean; captions: boolean } = {
    ...settingsInitialState,
  };

  /** The rendered settings button; kept so `render` stays idempotent across reconnects. */
  private settingsButton: HTMLButtonElement | null = null;

  /** The rendered main menu panel; kept so submenu navigation can rebuild its contents. */
  private menu: HTMLDivElement | null = null;

  /** The rendered submenu panel; kept so a category selection can populate + reveal it. */
  private submenu: HTMLDivElement | null = null;

  /** Latest playbackRate mirrored from the store, used to mark the active speed option. */
  private playbackRate = 1;

  /** Latest playbackQuality mirrored from the store, used to mark the active quality option. */
  private playbackQuality: number | null = null;

  /**
   * Public setter for the quality option list (default `[]`). Rebuilds the menu so the new
   * qualities appear right away, keeping the Markup_Contract in sync with the input.
   */
  set qualityOptions(options: SettingsQualityOption[]) {
    this._qualityOptions = Array.isArray(options) ? options : [];
    this.rebuildMenu();
  }

  get qualityOptions(): SettingsQualityOption[] {
    return this._qualityOptions;
  }

  /**
   * Public setter for the minimal i18n label bag. Rebuilds the menu so translated labels
   * apply immediately; passing `null` restores the English defaults.
   */
  set i18n(value: SettingsI18n | null) {
    this._i18n = value;
    this.rebuildMenu();
  }

  get i18n(): SettingsI18n | null {
    return this._i18n;
  }

  /**
   * Tracks the current playbackRate/quality from the store so the active option can be marked
   * (Req 3.3). Reflects `data-quality` on the host as a stable state hook and re-marks the
   * active entries in whichever panel is currently rendered. Only the fields this element
   * cares about are reflected, per the base class's opt-in `onStoreChange` design.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    this.playbackRate = state.playbackRate;
    this.playbackQuality = state.playbackQuality;
    this.reflectState({ quality: state.playbackQuality });
    this.markActiveOptions();
  }

  /**
   * Resolves the effective i18n bag: the consumer-provided labels take precedence, then the
   * English defaults from `@i18n`. Returned as the loose `SettingsI18n` shape that
   * `buildSettingsOptions`/`buildSettingsLabel` accept.
   */
  private resolveI18n(): SettingsI18n {
    return { ...(en as SettingsI18n), ...(this._i18n ?? {}) };
  }

  /**
   * Builds the top-level settings structure from the SAME pure helper the rest of Core uses
   * (Req 1.6). Captions are intentionally excluded (`captionOptions: null`) since this element
   * owns speed + quality only; `live`/`adMode` stay `false` so the Speed entry is always
   * available with its default options.
   */
  private buildOptions(): SettingsOption[] {
    return buildSettingsOptions({
      qualityOptions: this._qualityOptions,
      captionOptions: null,
      live: false,
      adMode: false,
      i18n: this.resolveI18n(),
    });
  }

  /**
   * Toggles the main menu open/closed and reflects `data-open` on the host (Req 3.3). Closing
   * the menu also resets the submenu selection so the next open starts at the top level,
   * mirroring `settingsInitialState`.
   */
  private toggleMenu(): void {
    const nextOpen = !this.uiState.generalMenu;
    this.uiState = nextOpen ? { ...settingsInitialState, generalMenu: true } : { ...settingsInitialState };
    this.reflectOpenState();
    this.renderPanels();
  }

  /**
   * Opens the submenu for a given top-level category (`speed`/`quality`), keeping the main
   * menu open. Populates and reveals the submenu with that category's options.
   */
  private openSubmenu(category: typeof SPEED_KEY | typeof QUALITY_KEY): void {
    this.uiState = {
      ...settingsInitialState,
      generalMenu: true,
      speed: category === SPEED_KEY,
      quality: category === QUALITY_KEY,
    };
    this.renderPanels();
  }

  /** Reflects the current open state to `data-open` on the host so the Style_Layer reacts. */
  private reflectOpenState(): void {
    if (this.uiState.generalMenu) {
      this.setAttribute('data-open', 'true');
    } else {
      this.removeAttribute('data-open');
    }
  }

  /**
   * Emits the request for a selected option. Speed selections map to the defined
   * `playerstack-rate-request` (`{ rate }`, Req 2.1); quality selections emit the custom,
   * adapter-extensible `playerstack-quality-request` (`{ value }`). The panel closes after a
   * selection so the interaction reads as "pick and dismiss".
   */
  private selectOption(category: typeof SPEED_KEY | typeof QUALITY_KEY, value: string): void {
    if (category === SPEED_KEY) {
      this.dispatchRequest('playerstack-rate-request', { rate: Number(value) });
    } else {
      this.dispatchRequest('playerstack-quality-request', { value });
    }
    this.uiState = { ...settingsInitialState };
    this.reflectOpenState();
    this.renderPanels();
  }

  /**
   * Builds the settings button and the (initially hidden) menu/submenu panels. Nodes are
   * created and APPENDED (never via `innerHTML`) so the adopted Style_Layer — in the fallback
   * path an injected `<style>` — is preserved. A guard keeps `render` idempotent across
   * reconnects.
   */
  protected render(): void {
    if (this.settingsButton !== null) {
      return;
    }

    const button = document.createElement('button');
    button.setAttribute('part', 'settings-button');
    button.setAttribute('type', 'button');
    // Accessible name from the host's `aria-label` when set, else the default (Req 1.5).
    button.setAttribute('aria-label', this.getAttribute('aria-label') ?? DEFAULT_LABEL);

    // Gear glyph: class names match the Style_Layer selectors that render the settings icon.
    const icon = document.createElement('span');
    icon.className = 'icon icon-settings';
    button.appendChild(icon);

    const onButtonClick = (): void => this.toggleMenu();
    button.addEventListener('click', onButtonClick);
    this.addDisposer(() => button.removeEventListener('click', onButtonClick));

    const menu = document.createElement('div');
    menu.setAttribute('part', 'menu');

    const submenu = document.createElement('div');
    submenu.setAttribute('part', 'submenu');

    this.settingsButton = button;
    this.menu = menu;
    this.submenu = submenu;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(button);
    this.root.appendChild(menu);
    this.root.appendChild(submenu);

    this.reflectOpenState();
    this.renderPanels();
  }

  /**
   * Rebuilds the menu contents when the inputs (`qualityOptions`/`i18n`) change after the
   * initial render. No-op before `render` has created the panels.
   */
  private rebuildMenu(): void {
    if (this.menu === null) {
      return;
    }
    this.renderPanels();
  }

  /**
   * Renders the top-level menu and, when a category is open, its submenu. Rebuilds the panel
   * children from the freshly-built option structure so navigation state and inputs stay
   * reflected in the DOM. Active options are marked afterwards.
   */
  private renderPanels(): void {
    if (this.menu === null || this.submenu === null) {
      return;
    }

    const options = this.buildOptions();

    // Main menu: one row per top-level category (Speed / Quality). Clicking a row opens its
    // submenu without leaving the main menu.
    this.menu.replaceChildren();
    for (const option of options) {
      const item = document.createElement('button');
      item.setAttribute('type', 'button');
      item.setAttribute('part', 'menu-item');
      item.setAttribute('data-category', option.value);
      item.textContent = option.label;

      const onItemClick = (): void => {
        if (option.value === SPEED_KEY || option.value === QUALITY_KEY) {
          this.openSubmenu(option.value);
        }
      };
      item.addEventListener('click', onItemClick);
      this.addDisposer(() => item.removeEventListener('click', onItemClick));
      this.menu.appendChild(item);
    }

    // Submenu: options for whichever category is currently open (if any).
    this.submenu.replaceChildren();
    const openCategory = this.uiState.speed ? SPEED_KEY : this.uiState.quality ? QUALITY_KEY : null;
    if (openCategory !== null) {
      const category = options.find((option) => option.value === openCategory);
      const i18n = this.resolveI18n();
      for (const child of category?.options ?? []) {
        const item = document.createElement('button');
        item.setAttribute('type', 'button');
        item.setAttribute('part', 'submenu-item');
        item.setAttribute('data-value', child.value);
        // Reuse the shared label builder so e.g. speed `1` reads "Normal" and quality `0`
        // reads "Auto" consistently with the rest of Core (Req 1.6).
        item.textContent = buildSettingsLabel({ label: openCategory, value: child.value, i18n });

        const onChildClick = (): void => this.selectOption(openCategory, child.value);
        item.addEventListener('click', onChildClick);
        this.addDisposer(() => item.removeEventListener('click', onChildClick));
        this.submenu.appendChild(item);
      }
    }

    this.markActiveOptions();
  }

  /**
   * Marks the active speed/quality option in the submenu with `data-active` so the Style_Layer
   * can highlight the current selection (Req 3.3). Kept simple: it toggles the attribute on the
   * matching `submenu-item` based on the tracked `playbackRate`/`playbackQuality`.
   */
  private markActiveOptions(): void {
    if (this.submenu === null) {
      return;
    }
    const openCategory = this.uiState.speed ? SPEED_KEY : this.uiState.quality ? QUALITY_KEY : null;
    const activeValue =
      openCategory === SPEED_KEY
        ? String(this.playbackRate)
        : openCategory === QUALITY_KEY
          ? String(this.playbackQuality ?? 0)
          : null;

    const items = this.submenu.querySelectorAll('[part="submenu-item"]');
    items.forEach((node) => {
      const element = node as HTMLElement;
      if (activeValue !== null && element.getAttribute('data-value') === activeValue) {
        element.setAttribute('data-active', 'true');
      } else {
        element.removeAttribute('data-active');
      }
    });
  }
}
