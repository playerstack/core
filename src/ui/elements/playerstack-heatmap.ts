/**
 * `playerstack-heatmap` — renders the "most replayed" heatmap graph as an inline SVG stroke
 * (Req 1.4, 1.6, 3.3, 5.1, 5.3).
 *
 * As a display UI_Element it only reflects state: it consumes the shared store (for the total
 * duration) and never touches the media element or dispatches requests. The heatmap data
 * points are supplied by the consumer/adapter through the `heatmapData` property. The element
 * derives the SVG stroke `d` with the SAME pure `generateHeatmapPath` helper the rest of Core
 * uses (Req 1.6), pairing the data points with the store's `duration`, so the curve stays
 * consistent with the headless layer and the React skin's HeatmapGraph.
 *
 * WHY the SVG is built with `createElementNS`: SVG elements live in the SVG namespace, so
 * `document.createElement('svg')` would produce an inert HTML-namespaced node. Using
 * `document.createElementNS('http://www.w3.org/2000/svg', ...)` yields a real, rendered SVG.
 * The `viewBox` is fixed at `0 0 100 100` because `generateHeatmapPath` emits coordinates in a
 * 0-100 space (x = percentage of duration, y = 100 - value*100).
 *
 * The path is recomputed both when the data points are assigned and when the store reports a
 * new duration (the x-coordinates depend on the total duration). When there is a non-empty
 * path, `data-active` is reflected on the host so the Style_Layer can toggle the graph
 * (Req 3.3).
 */
import type { HeatmapInput } from '@typings/ui/playerstack-heatmap.types';
import type { HeatmapDataPoint } from '@typings/heatmap.types';
import type { MediaStoreState } from '@typings/ui/media-store.types';
import { PlayerstackElement } from '@ui/playerstack-element';
import { generateHeatmapPath } from '@heatmap';

/** SVG namespace URI required so `createElementNS` yields real, rendered SVG nodes. */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** Fixed viewBox matching the 0-100 coordinate space `generateHeatmapPath` emits. */
const HEATMAP_VIEW_BOX = '0 0 100 100';

export class PlayerstackHeatmap extends PlayerstackElement {
  /**
   * Heatmap data points tracked from the assigned input. Empty until a consumer/adapter
   * supplies them via `heatmapData`; paired with the store `duration` to compute the path.
   */
  private data: HeatmapDataPoint[] = [];

  /** Latest total duration (seconds) mirrored from the store; feeds the x-coordinate scale. */
  private duration = 0;

  /** The rendered heatmap container; kept so `render` stays idempotent across reconnects. */
  private container: HTMLElement | null = null;

  /** The rendered `<path>` element; receives the generated `d` on every recompute. */
  private path: SVGPathElement | null = null;

  /**
   * Public setter/property to supply the heatmap data points (matching what
   * `generateHeatmapPath` expects, Req 1.6). Assigning data recomputes the SVG path against
   * the current duration and repaints immediately so the graph reflects the new data without
   * waiting for the next store update.
   */
  set heatmapData(input: HeatmapInput | null) {
    this.data = input ?? [];
    this.updatePath();
  }

  get heatmapData(): HeatmapInput | null {
    return this.data;
  }

  /**
   * Tracks the total duration this element cares about; a duration change recomputes the path
   * because the x-coordinates scale by duration. Only the single field needed is read, per the
   * base class's opt-in `onStoreChange` design.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    if (state.duration !== this.duration) {
      this.duration = state.duration;
      this.updatePath();
    }
  }

  /**
   * Computes the SVG stroke `d` from the tracked data points + duration via the shared
   * `generateHeatmapPath` (Req 1.6), writes it onto the `<path>`, and reflects `data-active`
   * on the host when the path is non-empty (Req 3.3). Guards for the pre-render window: if
   * called before `render` created the path, the paint is skipped and `render` repaints from
   * the latest state on connect.
   */
  private updatePath(): void {
    if (this.path === null) {
      return;
    }
    const d = generateHeatmapPath(this.data, this.duration);
    this.path.setAttribute('d', d);
    // Reflect whether there is a drawable curve so the Style_Layer can toggle the graph.
    this.reflectState({ active: d.length > 0 });
  }

  /**
   * Builds the Markup_Contract: a `part="heatmap"` container holding an inline
   * `part="heatmap-svg"` `<svg>` with a `part="heatmap-path"` `<path>`. The SVG nodes are
   * created in the SVG namespace via `createElementNS` and APPENDED (never via `innerHTML`) so
   * the adopted Style_Layer — in the fallback path an injected `<style>` — is preserved. A
   * guard keeps `render` idempotent across reconnects.
   */
  protected render(): void {
    if (this.container !== null) {
      return;
    }

    const container = document.createElement('div');
    container.setAttribute('part', 'heatmap');

    // SVG elements MUST be created in the SVG namespace to render; the viewBox matches the
    // 0-100 coordinate space `generateHeatmapPath` produces.
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    svg.setAttribute('part', 'heatmap-svg');
    svg.setAttribute('viewBox', HEATMAP_VIEW_BOX);
    // Preserve none so the curve stretches to whatever box the Style_Layer sizes.
    svg.setAttribute('preserveAspectRatio', 'none');

    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('part', 'heatmap-path');

    svg.appendChild(path);
    container.appendChild(svg);

    this.container = container;
    this.path = path;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(container);

    // Recompute + paint from whatever duration the store has already delivered (if the context
    // resolved before render ran) and from any data assigned before connect.
    const state = this.store?.getState();
    if (state !== undefined) {
      this.duration = state.duration;
    }
    this.updatePath();
  }
}
