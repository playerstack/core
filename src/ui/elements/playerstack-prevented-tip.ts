/**
 * `playerstack-prevented-tip` — the blocked-playback tip (Req 1.4, 3.3, 5.1, 5.3).
 *
 * As a display UI_Element it only reflects state: it consumes i18n and never touches the media
 * element or dispatches requests. It renders a `part="prevented-tip"` region with a
 * `part="prevented-tip-message"` text node carrying a localized tip shown when playback is
 * blocked/prevented (e.g. autoplay-with-sound policies) — the message comes from
 * `getTranslations(language)` (Req 1.4).
 *
 * There is no dedicated "prevented" field on the store yet, so this element keeps the i18n tip
 * text rendered and lets the consumer/adapter (or a future store field) toggle its visibility
 * through the reflected `data-*`/Style_Layer. On a kernel error it reflects `data-active` so
 * the Style_Layer can surface the tip; otherwise it stays inactive. The message language is
 * configurable through the `language` attribute (defaulting to `en`); changing it re-resolves
 * the translations and repaints the tip text.
 */
import type { PreventedTipDefaultLanguage, PreventedTipPart } from '@typings/ui/playerstack-prevented-tip.types';
import type { MediaStoreState } from '@typings/ui/media-store.types';
import type { Translations } from '@i18n/index';
import { PlayerstackElement } from '@ui/playerstack-element';
import { getTranslations } from '@i18n/index';

/** Default language applied when no `language` attribute is provided (Req 1.4). */
const DEFAULT_LANGUAGE: PreventedTipDefaultLanguage = 'en';

export class PlayerstackPreventedTip extends PlayerstackElement {
  /**
   * Declares `language` as an observed attribute so the tip language is configurable via
   * markup (Req 1.4). Driving `observedAttributes` from the schema keeps it the single source
   * of truth.
   */
  static override attributeSchema = {
    language: { attribute: 'language', type: 'string' },
  } as const;

  /** Resolved translations for the current language; re-resolved on attribute change. */
  private translations: Translations = getTranslations(DEFAULT_LANGUAGE);

  /** Whether the store currently reports a kernel error, i.e. the tip should be surfaced. */
  private prevented = false;

  /** The rendered tip container; kept so `render` stays idempotent across reconnects. */
  private container: HTMLElement | null = null;

  /** The rendered tip text region; updated with the localized tip on change. */
  private messageRegion: HTMLElement | null = null;

  /**
   * Tracks whether playback is currently blocked (surfaced via a kernel error) and repaints
   * the tip. Only the single field this element cares about is read, per the base class's
   * opt-in `onStoreChange` design.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    this.prevented = state.kernelError !== null && state.kernelError !== undefined;
    this.updateTip();
  }

  /**
   * Re-resolves the translations when the `language` attribute changes and repaints the tip so
   * the region reflects the new language immediately.
   */
  protected override onAttributeChanged(propKey: string, value: string | number | boolean): void {
    if (propKey === 'language' && typeof value === 'string') {
      this.translations = getTranslations(value);
      this.updateTip();
    }
  }

  /**
   * Writes the localized tip into the `part="prevented-tip-message"` region and reflects
   * `data-active` on the host when playback is blocked (Req 3.3). The tip text stays rendered
   * so a consumer/adapter can surface it; `data-active` gives the Style_Layer a hook to toggle
   * visibility. Guards for the pre-render window: if called before `render` created the region,
   * the paint is skipped and `render` repaints from the latest state on connect.
   */
  private updateTip(): void {
    if (this.messageRegion === null) {
      return;
    }
    this.messageRegion.textContent = this.translations.clickToUnmute ?? '';
    this.reflectState({ active: this.prevented });
  }

  /**
   * Builds the Markup_Contract: a `part="prevented-tip"` region holding a
   * `part="prevented-tip-message"` text region. Nodes are created and APPENDED (never via
   * `innerHTML`) so the adopted Style_Layer — in the fallback path an injected `<style>` — is
   * preserved. A guard keeps `render` idempotent across reconnects.
   */
  protected render(): void {
    if (this.container !== null) {
      return;
    }

    // Seed translations from any `language` attribute set before connect.
    this.translations = getTranslations(this.getAttribute('language') ?? DEFAULT_LANGUAGE);

    const containerPart: PreventedTipPart = 'prevented-tip';
    const container = document.createElement('div');
    container.setAttribute('part', containerPart);

    const messagePart: PreventedTipPart = 'prevented-tip-message';
    const messageRegion = document.createElement('div');
    messageRegion.setAttribute('part', messagePart);

    container.appendChild(messageRegion);

    this.container = container;
    this.messageRegion = messageRegion;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(container);

    // Paint from whatever state the store has already delivered (if the context resolved
    // before render ran).
    const state = this.store?.getState();
    if (state !== undefined) {
      this.prevented = state.kernelError !== null && state.kernelError !== undefined;
    }
    this.updateTip();
  }
}
