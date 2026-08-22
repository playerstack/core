import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';
import { formatTime } from '@utils/format';

/**
 * Spec for `playerstack-audio-controls` — the compact audio controls cluster UI_Element
 * (Req 3.3, 5.1, 5.2, 5.3, 17.5). It verifies the Markup_Contract (`part="audio-controls"`
 * with `part="play-button"`, `part="time"`, `part="slider"`/`track`/`track-fill`),
 * store→data-* propagation (`data-playing`, time text and played-fill width), and
 * request-event wiring: a play-button click emits play/pause; a slider click emits a seek
 * request (Req 2.1).
 *
 * The seek handler reads `track.getBoundingClientRect()`, which returns zeros in jsdom, so the
 * track rect is stubbed to `{ left:0, width:100 }`; with `duration=100` a click at
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

/** Creates a connected controller host and an audio-controls child wired to its store. */
function mount(): { host: PlayerstackMediaController; el: HTMLElement } {
  const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
  document.body.appendChild(host);
  const el = document.createElement('playerstack-audio-controls');
  host.appendChild(el);
  return { host, el };
}

describe('playerstack-audio-controls', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Markup_Contract (Req 5.1, 5.2, 5.3)', () => {
    it('renders part="audio-controls" with play-button/time/slider/track/track-fill', () => {
      const { el } = mount();
      const root = el;

      expect(root.querySelector('[part="audio-controls"]')).not.toBeNull();
      expect(root.querySelector('[part="play-button"]')).not.toBeNull();
      expect(root.querySelector('[part="time"]')).not.toBeNull();
      expect(root.querySelector('[part="slider"]')).not.toBeNull();
      expect(root.querySelector('[part="track"]')).not.toBeNull();
      expect(root.querySelector('[part="track-fill"]')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount();
      expect((el).innerHTML).toMatchSnapshot();
    });
  });

  describe('store→data-* propagation (Req 3.3)', () => {
    it('reflects data-playing and updates the time text and fill width from the store', () => {
      const { host, el } = mount();
      const root = el;

      host.store.set({ playing: true, seek: 25, duration: 100 });

      expect(el.getAttribute('data-playing')).toBe('true');
      expect(root.querySelector('[part="time"]')?.textContent).toBe(`${formatTime(25)} / ${formatTime(100)}`);
      const fill = root.querySelector('[part="track-fill"]') as HTMLElement;
      expect(fill.style.width).toBe('25%');
    });
  });

  describe('request-event wiring (Req 2.1)', () => {
    it('emits play/pause requests from the play button based on state', () => {
      const { host, el } = mount();
      const button = (el).querySelector('[part="play-button"]') as HTMLButtonElement;

      const play: CustomEvent[] = [];
      const pause: CustomEvent[] = [];
      document.addEventListener('playerstack-play-request', (e) => play.push(e as CustomEvent));
      document.addEventListener('playerstack-pause-request', (e) => pause.push(e as CustomEvent));

      host.store.set({ playing: false });
      button.click();
      expect(play).toHaveLength(1);

      host.store.set({ playing: true });
      button.click();
      expect(pause).toHaveLength(1);
    });

    it('emits a seek request on a slider click', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });

      const root = el;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);

      const received: Array<CustomEvent<{ time: number }>> = [];
      document.addEventListener('playerstack-seek-request', (e) => received.push(e as CustomEvent<{ time: number }>));

      slider.dispatchEvent(new MouseEvent('click', { clientX: 50, bubbles: true }));

      expect(received).toHaveLength(1);
      expect(received[0]?.detail.time).toBe(50);
    });
  });
});
