/**
 * `playerstack-play-time` — the current-time / duration read-out (Req 1.4, 1.6, 3.3, 5.1, 5.3).
 *
 * As a display UI_Element it only reflects state: it consumes the shared store and never
 * touches the media element or dispatches requests. On every store change it writes the
 * current position into the `part="current-time"` span and the total duration into the
 * `part="duration"` span, both formatted with the SAME `formatTime` helper the rest of Core
 * uses (Req 1.6) so the displayed strings stay consistent (e.g. `01:23 / 04:56`).
 *
 * There is no configurable label to expose — the element renders plain formatted time text —
 * so it declares no observed attributes and keeps the Markup_Contract minimal. The `/`
 * separator is decorative, so it carries `aria-hidden` to avoid announcing punctuation.
 */
import type { MediaStoreState } from '@typings/ui/media-store.types';
import { PlayerstackElement } from '@ui/playerstack-element';
import { formatTime } from '@utils/format';

export class PlayerstackPlayTime extends PlayerstackElement {
  /** The rendered current-time span; kept so `render` stays idempotent across reconnects. */
  private currentTimeSpan: HTMLSpanElement | null = null;

  /** The rendered duration span; kept so `onStoreChange` can update it after render. */
  private durationSpan: HTMLSpanElement | null = null;

  /**
   * Mirrors the current position and total duration from the store into the two spans,
   * formatted through the shared `formatTime` (Req 1.6). Guards for the pre-render window:
   * if the store notifies before `render` has created the spans, the values are skipped and
   * `render` paints them from the latest store state on connect.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    if (this.currentTimeSpan !== null) {
      this.currentTimeSpan.textContent = formatTime(state.seek);
    }
    if (this.durationSpan !== null) {
      this.durationSpan.textContent = formatTime(state.duration);
    }
  }

  /**
   * Builds the Markup_Contract: a `part="time"` container holding a `part="current-time"`
   * span, a decorative `/` separator, and a `part="duration"` span. Nodes are created and
   * APPENDED (never via `innerHTML`) so the adopted Style_Layer — in the fallback path an
   * injected `<style>` — is preserved. A guard keeps `render` idempotent across reconnects.
   */
  protected render(): void {
    if (this.currentTimeSpan !== null) {
      return;
    }

    const container = document.createElement('div');
    container.setAttribute('part', 'time');

    const currentTime = document.createElement('span');
    currentTime.setAttribute('part', 'current-time');
    // Seed with a formatted zero so the read-out is well-formed before any store update.
    currentTime.textContent = formatTime(0);

    // Decorative separator: hidden from assistive tech so only the two times are announced.
    const separator = document.createElement('span');
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = ' / ';

    const duration = document.createElement('span');
    duration.setAttribute('part', 'duration');
    duration.textContent = formatTime(0);

    container.appendChild(currentTime);
    container.appendChild(separator);
    container.appendChild(duration);

    this.currentTimeSpan = currentTime;
    this.durationSpan = duration;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(container);

    // Paint from whatever state the store has already delivered (if the context resolved
    // before render ran).
    const state = this.store?.getState();
    if (state !== undefined) {
      this.currentTimeSpan.textContent = formatTime(state.seek);
      this.durationSpan.textContent = formatTime(state.duration);
    }
  }
}
