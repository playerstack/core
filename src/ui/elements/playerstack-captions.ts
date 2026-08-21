/**
 * `playerstack-captions` — the caption overlay that renders the active cue text (Req 1.4,
 * 1.6, 3.3, 5.1, 5.3).
 *
 * As a display UI_Element it primarily reflects state: it consumes the shared store to paint
 * the active cue text and never touches the media element. It additionally exposes a
 * `selectCaption(value)` method that dispatches a `playerstack-caption-request` event so an
 * external caption-track selection can flow through the Request/Response model (Req 2.1,
 * 21.1) — mirroring the reactjs skin's `onCaptionChange`. The caption source is supplied by the
 * consumer/adapter through the `captionsSrc` property — either a raw VTT string (parsed here
 * with `parseVTTCaptions`) or an already-parsed cue array (handed straight in). Keeping the
 * VTT fetch out of scope means this element never performs network access; the adapter that
 * resolved a `spriteVttFile`-like source assigns the value (Req 1.6).
 *
 * On every store change it recomputes the active cues from the tracked cues + `state.seek`
 * using the SAME pure `getActiveCues` helper the rest of Core uses (Req 1.6), writes the
 * active cue text into the `part="cue"` region, and reflects `data-active` on the host so the
 * Style_Layer can show/hide the overlay based on whether a cue is showing (Req 3.3).
 */
import type { CaptionsSource, CaptionRequestDetail } from '@typings/ui/playerstack-captions.types';
import type { VTTCue } from '@typings/utils/captions.types';
import type { MediaStoreState } from '@typings/ui/media-store.types';
import { PlayerstackElement } from '@ui/playerstack-element';
import { parseVTTCaptions, getActiveCues } from '@utils/captions';

export class PlayerstackCaptions extends PlayerstackElement {
  /**
   * Parsed cues tracked from the assigned caption source. Empty until a consumer/adapter
   * supplies a source via `captionsSrc`; drives the active-cue computation on store change.
   */
  private cues: VTTCue[] = [];

  /** Latest seek position (seconds) mirrored from the store; selects the active cues. */
  private seek = 0;

  /** The rendered overlay container; kept so `render` stays idempotent across reconnects. */
  private container: HTMLElement | null = null;

  /** The rendered active-cue text region; updated with the active cue text on store change. */
  private cueRegion: HTMLElement | null = null;

  /**
   * Public setter/property to supply the caption source. A raw VTT string is parsed with the
   * shared `parseVTTCaptions` (Req 1.6); an already-parsed cue array is stored as-is so an
   * adapter that fetched and parsed the source can hand cues straight in. Repaints the active
   * cue immediately so the overlay reflects the new source without waiting for the next store
   * update.
   */
  set captionsSrc(source: CaptionsSource | null) {
    if (source === null) {
      this.cues = [];
    } else if (typeof source === 'string') {
      this.cues = parseVTTCaptions(source);
    } else {
      this.cues = source;
    }
    this.updateActiveCue();
  }

  get captionsSrc(): CaptionsSource | null {
    return this.cues;
  }

  /**
   * Emits a `playerstack-caption-request` event carrying the selected caption track `value`
   * (Req 2.1, 21.1). The element never resolves the track itself — it only expresses the
   * intent through the same bubbling + composed `dispatchRequest` channel every interactive
   * UI_Element uses, so an application/adapter that opts in (the reactjs `onCaptionChange`
   * flow) fulfils the selection. Public so a consumer or a sibling caption-options UI can
   * drive external track selection without coupling to this element's internals.
   */
  selectCaption(value: string): void {
    this.dispatchRequest<CaptionRequestDetail>('playerstack-caption-request', { value });
  }

  /**
   * Tracks the seek position this element cares about and repaints the active cue. Only the
   * single field needed is read, per the base class's opt-in `onStoreChange` design.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    this.seek = state.seek;
    this.updateActiveCue();
  }

  /**
   * Computes the active cues from the tracked cues + current seek via the shared
   * `getActiveCues` (Req 1.6), writes the joined active cue text into the `part="cue"` region,
   * and reflects `data-active` on the host when a cue is showing (Req 3.3). Guards for the
   * pre-render window: if called before `render` created the region, the paint is skipped and
   * `render` repaints from the latest state on connect.
   */
  private updateActiveCue(): void {
    if (this.cueRegion === null) {
      return;
    }
    const activeCues = getActiveCues(this.cues, this.seek);
    const text = activeCues.map((cue) => cue.text).join('\n');
    this.cueRegion.textContent = text;
    // Reflect whether a cue is currently showing so the Style_Layer can toggle the overlay.
    this.reflectState({ active: activeCues.length > 0 });
  }

  /**
   * Builds the Markup_Contract: a `part="captions"` overlay container holding a `part="cue"`
   * text region. Nodes are created and APPENDED (never via `innerHTML`) so the adopted
   * Style_Layer — in the fallback path an injected `<style>` — is preserved. A guard keeps
   * `render` idempotent across reconnects.
   */
  protected render(): void {
    if (this.container !== null) {
      return;
    }

    const container = document.createElement('div');
    container.setAttribute('part', 'captions');

    const cueRegion = document.createElement('div');
    cueRegion.setAttribute('part', 'cue');

    container.appendChild(cueRegion);

    this.container = container;
    this.cueRegion = cueRegion;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(container);

    // Paint the active cue from whatever seek the store has already delivered (if the context
    // resolved before render ran) and from any source assigned before connect.
    const state = this.store?.getState();
    if (state !== undefined) {
      this.seek = state.seek;
    }
    this.updateActiveCue();
  }
}
