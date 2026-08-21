import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';

/**
 * Spec for `playerstack-volume` — the mute toggle + volume slider UI_Element (Req 3.3, 5.1,
 * 5.2, 5.3, 17.5). It verifies the Markup_Contract (`part="mute-button"` + `part="volume"`
 * with slider/track/track-fill/thumb), store→`data-muted` + fill-width propagation (Req 3.3),
 * and request-event wiring: mute/unmute on button click and a volume request on slider click
 * (Req 2.1).
 *
 * The slider click handler reads `track.getBoundingClientRect()`, which returns zeros in jsdom.
 * To exercise the volume request path the track rect is stubbed to `{ left:0, width:100 }` so a
 * click at `clientX=50` maps to a `0.5` volume via the shared `getVolumePercentage` geometry.
 */
registerPlayerstackElements();

/** A DOMRect stub with a real width so the slider geometry computes a non-zero volume. */
const RECT_100: DOMRect = {
  left: 0,
  width: 100,
  top: 0,
  height: 10,
  right: 100,
  bottom: 10,
  x: 0,
  y: 0,
  toJSON() {
    return {};
  },
};

/** Creates a connected controller host and a volume child wired to its store. */
function mount(): { host: PlayerstackMediaController; el: HTMLElement } {
  const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
  document.body.appendChild(host);
  const el = document.createElement('playerstack-volume');
  host.appendChild(el);
  return { host, el };
}

describe('playerstack-volume', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Markup_Contract (Req 5.1, 5.2, 5.3)', () => {
    it('renders part="mute-button" and part="volume" with slider parts', () => {
      const { el } = mount();
      const root = el.shadowRoot as ShadowRoot;

      const button = root.querySelector('[part="mute-button"]');
      expect(button).not.toBeNull();
      expect(button?.getAttribute('type')).toBe('button');
      expect(root.querySelector('.icon-volume')).not.toBeNull();
      expect(root.querySelector('.icon-muted')).not.toBeNull();
      expect(root.querySelector('[part="volume"]')).not.toBeNull();
      expect(root.querySelector('[part="slider"]')).not.toBeNull();
      expect(root.querySelector('[part="track"]')).not.toBeNull();
      expect(root.querySelector('[part="track-fill"]')).not.toBeNull();
      expect(root.querySelector('[part="thumb"]')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount();
      expect((el.shadowRoot as ShadowRoot).innerHTML).toMatchSnapshot();
    });
  });

  describe('store→data-* propagation (Req 3.3)', () => {
    it('reflects data-muted from the store', () => {
      const { host, el } = mount();

      // Booleans are JSON-encoded onto the host `data-*` attribute; only a `null` reflected
      // value removes it, so a `false` state reflects as the string `"false"`.
      host.store.set({ isMuted: true });
      expect(el.getAttribute('data-muted')).toBe('true');

      host.store.set({ isMuted: false });
      expect(el.getAttribute('data-muted')).toBe('false');
    });

    it('updates the track-fill width from the store volume', () => {
      const { host, el } = mount();
      const fill = (el.shadowRoot as ShadowRoot).querySelector('[part="track-fill"]') as HTMLElement;

      host.store.set({ volume: 0.25 });
      expect(fill.style.width).toBe('25%');

      host.store.set({ volume: 1 });
      expect(fill.style.width).toBe('100%');
    });
  });

  describe('request-event wiring (Req 2.1)', () => {
    it('emits playerstack-mute-request when unmuted', () => {
      const { host, el } = mount();
      host.store.set({ isMuted: false });

      const received: CustomEvent[] = [];
      document.addEventListener('playerstack-mute-request', (e) => received.push(e as CustomEvent));

      const button = (el.shadowRoot as ShadowRoot).querySelector('[part="mute-button"]') as HTMLButtonElement;
      button.click();

      expect(received).toHaveLength(1);
      expect(received[0]?.composed).toBe(true);
    });

    it('emits playerstack-unmute-request when muted', () => {
      const { host, el } = mount();
      host.store.set({ isMuted: true });

      const received: CustomEvent[] = [];
      document.addEventListener('playerstack-unmute-request', (e) => received.push(e as CustomEvent));

      const button = (el.shadowRoot as ShadowRoot).querySelector('[part="mute-button"]') as HTMLButtonElement;
      button.click();

      expect(received).toHaveLength(1);
    });

    it('emits playerstack-volume-request with the computed volume on slider click', () => {
      const { el } = mount();
      const root = el.shadowRoot as ShadowRoot;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);

      const received: Array<CustomEvent<{ volume: number }>> = [];
      document.addEventListener('playerstack-volume-request', (e) =>
        received.push(e as CustomEvent<{ volume: number }>),
      );

      slider.dispatchEvent(new MouseEvent('click', { clientX: 50, bubbles: true }));

      expect(received).toHaveLength(1);
      expect(received[0]?.detail.volume).toBeCloseTo(0.5);
    });
  });
});
