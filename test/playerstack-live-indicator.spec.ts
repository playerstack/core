import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';
import { formatLiveOffset } from '@live-dvr';
import type { LiveDVRState } from '@typings/live-dvr.types';

/**
 * Spec for `playerstack-live-indicator` — the LIVE status indicator UI_Element (Req 3.3, 5.1,
 * 5.2, 5.3, 17.5). It verifies the Markup_Contract (`part="live-indicator"` with `live-dot`
 * and `live-offset`), state propagation from the `dvrState` setter (`data-live`/`data-at-edge`
 * plus the formatted offset text), and request-event wiring: clicking while behind live emits
 * a `playerstack-seek-request` targeting `seekableEnd`; clicking at the edge is a no-op
 * (Req 2.1).
 */
registerPlayerstackElements();

/** A full `LiveDVRState` behind the live edge (80s behind, seekable window to 200s). */
const BEHIND_LIVE: LiveDVRState = {
  hasDVR: true,
  seekableStart: 0,
  seekableEnd: 200,
  seekableWindow: 200,
  isAtLiveEdge: false,
  liveEdgeOffset: -80,
  sliderDuration: 200,
  sliderPosition: 120,
};

/** Creates a connected controller host and a live-indicator child wired to its store. */
function mount(): { host: PlayerstackMediaController; el: HTMLElement } {
  const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
  document.body.appendChild(host);
  const el = document.createElement('playerstack-live-indicator');
  host.appendChild(el);
  return { host, el };
}

describe('playerstack-live-indicator', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Markup_Contract (Req 5.1, 5.2, 5.3)', () => {
    it('renders part="live-indicator" with a dot and an offset region', () => {
      const { el } = mount();
      const root = el.shadowRoot as ShadowRoot;

      expect(root.querySelector('[part="live-indicator"]')).not.toBeNull();
      expect(root.querySelector('[part="live-dot"]')).not.toBeNull();
      expect(root.querySelector('[part="live-offset"]')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount();
      (el as unknown as { dvrState: LiveDVRState }).dvrState = BEHIND_LIVE;
      expect((el.shadowRoot as ShadowRoot).innerHTML).toMatchSnapshot();
    });
  });

  describe('state propagation (Req 3.3)', () => {
    it('reflects data-live, data-at-edge false and shows the formatted negative offset', () => {
      const { el } = mount();
      (el as unknown as { dvrState: LiveDVRState }).dvrState = BEHIND_LIVE;

      expect(el.getAttribute('data-live')).toBe('true');
      expect(el.getAttribute('data-at-edge')).toBe('false');
      const offset = (el.shadowRoot as ShadowRoot).querySelector('[part="live-offset"]');
      expect(offset?.textContent).toBe(formatLiveOffset(-80, false));
      expect(offset?.textContent).toBe('-1:20');
    });
  });

  describe('request-event wiring (Req 2.1)', () => {
    it('dispatches a seek request targeting seekableEnd when clicked behind live', () => {
      const { el } = mount();
      (el as unknown as { dvrState: LiveDVRState }).dvrState = BEHIND_LIVE;

      const received: Array<CustomEvent<{ time: number }>> = [];
      document.addEventListener('playerstack-seek-request', (e) => received.push(e as CustomEvent<{ time: number }>));

      (el.shadowRoot as ShadowRoot).querySelector<HTMLElement>('[part="live-indicator"]')?.click();

      expect(received).toHaveLength(1);
      expect(received[0]?.detail.time).toBe(200);
    });

    it('is a no-op when already at the live edge', () => {
      const { el } = mount();
      (el as unknown as { dvrState: LiveDVRState }).dvrState = { ...BEHIND_LIVE, isAtLiveEdge: true };

      const received: CustomEvent[] = [];
      document.addEventListener('playerstack-seek-request', (e) => received.push(e as CustomEvent));

      (el.shadowRoot as ShadowRoot).querySelector<HTMLElement>('[part="live-indicator"]')?.click();

      expect(received).toHaveLength(0);
    });
  });
});
