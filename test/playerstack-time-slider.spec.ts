import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';

/**
 * Spec for `playerstack-time-slider` — the progress slider UI_Element (Req 3.3, 5.1, 5.2, 5.3,
 * 17.5). It verifies the Markup_Contract (`part="time-slider"` container with slider/track/
 * track-buffered/track-fill/thumb/tooltip/timelens), store→fill-width propagation from the
 * played/buffered progress (Req 3.3), and request-event wiring: a pointer release on the slider
 * emits `playerstack-seek-request` with the hovered time (Req 2.1).
 *
 * The pointer handler reads `track.getBoundingClientRect()`, which returns zeros in jsdom, so
 * the track rect is stubbed to `{ left:0, width:100 }`; with `duration=100` a release at
 * `clientX=50` maps to `time=50` via the shared `getTimeFromSliderPosition` geometry.
 */
registerPlayerstackElements();

/** A DOMRect stub with a real width so the slider geometry computes a non-zero time. */
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

/** Creates a connected controller host and a time-slider child wired to its store. */
function mount(): { host: PlayerstackMediaController; el: HTMLElement } {
  const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
  document.body.appendChild(host);
  const el = document.createElement('playerstack-time-slider');
  host.appendChild(el);
  return { host, el };
}

describe('playerstack-time-slider', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Markup_Contract (Req 5.1, 5.2, 5.3)', () => {
    it('renders part="time-slider" with slider/track/fills/thumb/tooltip/timelens', () => {
      const { el } = mount();
      const root = el.shadowRoot as ShadowRoot;

      expect(root.querySelector('[part="time-slider"]')).not.toBeNull();
      expect(root.querySelector('[part="slider"]')).not.toBeNull();
      expect(root.querySelector('[part="track"]')).not.toBeNull();
      expect(root.querySelector('[part="track-buffered"]')).not.toBeNull();
      expect(root.querySelector('[part="track-fill"]')).not.toBeNull();
      expect(root.querySelector('[part="thumb"]')).not.toBeNull();
      expect(root.querySelector('[part="tooltip"]')).not.toBeNull();
      expect(root.querySelector('[part="timelens"]')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount();
      expect((el.shadowRoot as ShadowRoot).innerHTML).toMatchSnapshot();
    });
  });

  describe('store→data-* propagation (Req 3.3)', () => {
    it('updates the played and buffered fill widths from the store progress', () => {
      const { host, el } = mount();
      const root = el.shadowRoot as ShadowRoot;
      const fill = root.querySelector('[part="track-fill"]') as HTMLElement;
      const buffered = root.querySelector('[part="track-buffered"]') as HTMLElement;

      host.store.set({ duration: 100, seek: 25, loaded: 50 });

      expect(fill.style.width).toBe('25%');
      expect(buffered.style.width).toBe('50%');
    });

    it('clamps the played fill width to 100% when seek exceeds duration', () => {
      const { host, el } = mount();
      const fill = (el.shadowRoot as ShadowRoot).querySelector('[part="track-fill"]') as HTMLElement;

      host.store.set({ duration: 100, seek: 200 });

      expect(fill.style.width).toBe('100%');
    });
  });

  describe('request-event wiring (Req 2.1)', () => {
    it('emits playerstack-seek-request with the hovered time on pointerup', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });

      const root = el.shadowRoot as ShadowRoot;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);

      const received: Array<CustomEvent<{ time: number }>> = [];
      document.addEventListener('playerstack-seek-request', (e) => received.push(e as CustomEvent<{ time: number }>));

      // jsdom may lack PointerEvent; a MouseEvent with `clientX` dispatched under the
      // `pointerup` type is delivered by event-type string, matching the element's listener.
      slider.dispatchEvent(new MouseEvent('pointerup', { clientX: 50, bubbles: true }));

      expect(received).toHaveLength(1);
      expect(received[0]?.detail.time).toBe(50);
      expect(received[0]?.composed).toBe(true);
    });

    it('ignores pointerup when the track has zero width', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      const root = el.shadowRoot as ShadowRoot;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue({ ...RECT_100, width: 0 });

      const received: Event[] = [];
      document.addEventListener('playerstack-seek-request', (e) => received.push(e));
      slider.dispatchEvent(new MouseEvent('pointerup', { clientX: 50, bubbles: true }));

      expect(received).toHaveLength(0);
    });
  });

  describe('hover affordances (tooltip + timelens)', () => {
    it('positions and shows the time tooltip on pointermove', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      const root = el.shadowRoot as ShadowRoot;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      const tooltip = root.querySelector('[part="tooltip"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);

      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, bubbles: true }));

      expect(tooltip.style.display).toBe('block');
      expect(tooltip.style.left).toBe('50px');
      // 50s of a 100s duration formatted by the shared formatTime helper.
      expect(tooltip.textContent).toBe('00:50');
    });

    it('ignores pointermove when the track has zero width', () => {
      const { el } = mount();
      const root = el.shadowRoot as ShadowRoot;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      const tooltip = root.querySelector('[part="tooltip"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue({ ...RECT_100, width: 0 });

      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, bubbles: true }));

      // Tooltip stays hidden (initial display is '' before any positioning).
      expect(tooltip.style.display).not.toBe('block');
    });

    it('hides the tooltip and timelens on pointerleave', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      const root = el.shadowRoot as ShadowRoot;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      const tooltip = root.querySelector('[part="tooltip"]') as HTMLElement;
      const timelens = root.querySelector('[part="timelens"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);

      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, bubbles: true }));
      slider.dispatchEvent(new MouseEvent('pointerleave', { bubbles: true }));

      expect(tooltip.style.display).toBe('none');
      expect(timelens.style.display).toBe('none');
    });
  });

  describe('timelens (spriteData) wiring (Req 1.6)', () => {
    const spriteData = {
      cues: [{ from: 0, to: 100, x: 0, y: 0, w: 160, h: 90, file: 'sprite.jpg' }],
      sheetSizes: { 'sprite.jpg': { w: 1600, h: 900 } },
    };

    it('exposes assigned spriteData via the getter', () => {
      const { el } = mount();
      (el as unknown as { spriteData: typeof spriteData }).spriteData = spriteData;
      expect((el as unknown as { spriteData: typeof spriteData }).spriteData).toBe(spriteData);
    });

    it('hides the timelens immediately when spriteData is cleared to null', () => {
      const { el } = mount();
      const root = el.shadowRoot as ShadowRoot;
      const timelens = root.querySelector('[part="timelens"]') as HTMLElement;
      (el as unknown as { spriteData: typeof spriteData | null }).spriteData = spriteData;
      (el as unknown as { spriteData: typeof spriteData | null }).spriteData = null;
      expect(timelens.style.display).toBe('none');
    });

    it('positions and shows the timelens frame on pointermove when spriteData is present', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      const root = el.shadowRoot as ShadowRoot;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      const timelens = root.querySelector('[part="timelens"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);
      // jsdom reports 0 for offsetWidth/Height; stub non-zero so computeSpriteFrame matches.
      Object.defineProperty(timelens, 'offsetWidth', { configurable: true, value: 160 });
      Object.defineProperty(timelens, 'offsetHeight', { configurable: true, value: 90 });
      (el as unknown as { spriteData: typeof spriteData }).spriteData = spriteData;

      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, bubbles: true }));

      expect(timelens.style.display).toBe('block');
      expect(timelens.style.left).toBe('50px');
      expect(timelens.style.backgroundImage).toContain('sprite.jpg');
    });

    it('hides the timelens when no sprite frame matches the hovered time', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      const root = el.shadowRoot as ShadowRoot;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      const timelens = root.querySelector('[part="timelens"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);
      // Container has zero size, so computeSpriteFrame returns null → timelens hidden.
      (el as unknown as { spriteData: typeof spriteData }).spriteData = spriteData;

      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, bubbles: true }));

      expect(timelens.style.display).toBe('none');
    });
  });
});
