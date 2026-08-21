import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';
import type { AdsConfig } from '@typings/adapters.types';

/**
 * Spec for `playerstack-ad-overlay` — the ad overlay UI_Element that owns a headless
 * `AdsController` (Req 3.3, 5.1, 5.2, 5.3, 17.5). It verifies the Markup_Contract
 * (`part="ad-overlay"` with `ad-skip-button`/`ad-progress`/`ad-click`), controller-driven
 * activation and progress from the store, and request-event wiring: once skippable, clicking
 * the skip button invokes the configured `onSkip` AND dispatches `playerstack-ad-skip`
 * (Req 2.1). `AdsController.update` is synchronous, so no fake timers are needed.
 */
registerPlayerstackElements();

/** Creates a connected controller host and an ad-overlay child wired to its store. */
function mount(): { host: PlayerstackMediaController; el: HTMLElement } {
  const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
  document.body.appendChild(host);
  const el = document.createElement('playerstack-ad-overlay');
  host.appendChild(el);
  return { host, el };
}

describe('playerstack-ad-overlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Markup_Contract + ARIA (Req 1.5, 5.1, 5.2, 5.3)', () => {
    it('renders part="ad-overlay" with skip button, progress and click regions', () => {
      const { el } = mount();
      const root = el.shadowRoot as ShadowRoot;

      expect(root.querySelector('[part="ad-overlay"]')).not.toBeNull();
      const skip = root.querySelector('[part="ad-skip-button"]');
      expect(skip).not.toBeNull();
      expect(skip?.getAttribute('type')).toBe('button');
      expect(skip?.getAttribute('aria-label')).toBe('Skip ad');
      expect(root.querySelector('[part="ad-progress"]')).not.toBeNull();
      expect(root.querySelector('[part="ad-click"]')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount();
      expect((el.shadowRoot as ShadowRoot).innerHTML).toMatchSnapshot();
    });
  });

  describe('controller-driven activation + skip wiring (Req 2.1, 3.3)', () => {
    it('activates, updates progress, enables skip and dispatches ad-skip + invokes onSkip', () => {
      const { host, el } = mount();
      const onSkip = jest.fn();
      const config: AdsConfig = { skipAfter: 2, onSkip, onAdClick: jest.fn() };
      (el as unknown as { ads: AdsConfig }).ads = config;

      // First play activates the pre-roll (notifyPlay fires once), then a progress update
      // past `skipAfter` makes the ad skippable.
      host.store.set({ playing: true });
      host.store.set({ seek: 3, duration: 10 });

      expect(el.getAttribute('data-active')).toBe('true');
      expect(el.getAttribute('data-can-skip')).toBe('true');

      const overlay = (el.shadowRoot as ShadowRoot).querySelector('[part="ad-overlay"]') as HTMLElement;
      expect(overlay.style.display).not.toBe('none');
      const progress = (el.shadowRoot as ShadowRoot).querySelector('[part="ad-progress"]') as HTMLElement;
      expect(progress.style.width).toBe('100%');

      const skipButton = (el.shadowRoot as ShadowRoot).querySelector('[part="ad-skip-button"]') as HTMLButtonElement;
      expect(skipButton.disabled).toBe(false);

      const received: CustomEvent[] = [];
      document.addEventListener('playerstack-ad-skip', (e) => received.push(e as CustomEvent));

      skipButton.click();

      expect(onSkip).toHaveBeenCalledTimes(1);
      expect(received).toHaveLength(1);
    });

    it('routes an ad-click through the controller and dispatches playerstack-ad-click', () => {
      const { host, el } = mount();
      const onAdClick = jest.fn();
      const config: AdsConfig = { skipAfter: 2, onSkip: jest.fn(), onAdClick };
      (el as unknown as { ads: AdsConfig }).ads = config;

      host.store.set({ playing: true });
      host.store.set({ seek: 1, duration: 10 });

      const received: CustomEvent[] = [];
      document.addEventListener('playerstack-ad-click', (e) => received.push(e as CustomEvent));

      const clickRegion = (el.shadowRoot as ShadowRoot).querySelector('[part="ad-click"]') as HTMLElement;
      clickRegion.click();

      expect(onAdClick).toHaveBeenCalledTimes(1);
      expect(received).toHaveLength(1);
    });

    it('hides the overlay and clears state when the ad completes', () => {
      const { host, el } = mount();
      const onAdComplete = jest.fn();
      const config: AdsConfig = { skipAfter: 2, onSkip: jest.fn(), onAdClick: jest.fn(), onAdComplete };
      (el as unknown as { ads: AdsConfig }).ads = config;

      host.store.set({ playing: true });
      host.store.set({ seek: 5, duration: 10 });
      // Reaching the end completes the ad (isEnded) → adCompleted hides the overlay.
      host.store.set({ seek: 10, duration: 10, isEnded: true });

      const overlay = (el.shadowRoot as ShadowRoot).querySelector('[part="ad-overlay"]') as HTMLElement;
      expect(overlay.style.display).toBe('none');
      expect(el.getAttribute('data-active')).toBeNull();
    });
  });

  describe('render idempotency', () => {
    it('keeps a single ad-overlay across disconnect/reconnect', () => {
      const { el } = mount();
      el.remove();
      // Reconnect under a fresh host so the base class re-runs render (guard early-returns).
      const host2 = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
      document.body.appendChild(host2);
      host2.appendChild(el);

      const overlays = (el.shadowRoot as ShadowRoot).querySelectorAll('[part="ad-overlay"]');
      expect(overlays).toHaveLength(1);
    });
  });
});
