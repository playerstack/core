import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';
import { formatTime } from '@utils/format';

/**
 * Spec for `playerstack-play-time` — the current-time / duration read-out UI_Element
 * (Req 3.3, 5.1, 5.2, 5.3, 17.5). As a display element it only reflects state: it verifies the
 * Markup_Contract (`part="time"` container holding `part="current-time"` and `part="duration"`
 * spans plus a decorative separator) and store→display propagation, where a store change updates
 * both spans with the shared `formatTime` output (Req 3.3).
 *
 * The element resolves the media context from an ancestor `playerstack-media-controller`, so
 * every test appends it as a light-DOM child of a connected controller and drives state via
 * `host.store`.
 */
registerPlayerstackElements();

/** Creates a connected controller host and a play-time child wired to its store. */
function mount(): { host: PlayerstackMediaController; el: HTMLElement } {
  const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
  document.body.appendChild(host);
  const el = document.createElement('playerstack-play-time');
  host.appendChild(el);
  return { host, el };
}

describe('playerstack-play-time', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Markup_Contract (Req 5.1, 5.2, 5.3)', () => {
    it('renders part="time" with current-time and duration spans', () => {
      const { el } = mount();
      const root = el.shadowRoot as ShadowRoot;

      expect(root.querySelector('[part="time"]')).not.toBeNull();
      const current = root.querySelector('[part="current-time"]');
      const duration = root.querySelector('[part="duration"]');
      expect(current).not.toBeNull();
      expect(duration).not.toBeNull();
      // Seeded with a formatted zero so the read-out is well-formed before any store update.
      expect(current?.textContent).toBe(formatTime(0));
      expect(duration?.textContent).toBe(formatTime(0));
      // Decorative separator hidden from assistive tech.
      expect(root.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount();
      expect((el.shadowRoot as ShadowRoot).innerHTML).toMatchSnapshot();
    });
  });

  describe('store→display propagation (Req 3.3)', () => {
    it('updates the current-time and duration text from the store', () => {
      const { host, el } = mount();
      const root = el.shadowRoot as ShadowRoot;

      host.store.set({ seek: 83, duration: 296 });

      expect(root.querySelector('[part="current-time"]')?.textContent).toBe(formatTime(83));
      expect(root.querySelector('[part="duration"]')?.textContent).toBe(formatTime(296));
    });
  });
});
