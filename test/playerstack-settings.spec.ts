import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';

/**
 * Spec for `playerstack-settings` — the settings control UI_Element (Req 3.3, 5.1, 5.2, 5.3,
 * 17.5). It verifies the Markup_Contract (`part="settings-button"` + `part="menu"` +
 * `part="submenu"`), store→`data-quality` propagation (Req 3.3), and the request-event wiring:
 * navigating the gear → Speed menu-item → a speed submenu-item emits `playerstack-rate-request`
 * with the selected rate (Req 2.1).
 *
 * The menu structure is built from the shared `buildSettingsOptions`, so the top-level rows are
 * queried by `[part="menu-item"]` (Speed is always present) and the speed choices by
 * `[part="submenu-item"]` with their `data-value`.
 */
registerPlayerstackElements();

/** Creates a connected controller host and a settings child wired to its store. */
function mount(): { host: PlayerstackMediaController; el: HTMLElement } {
  const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
  document.body.appendChild(host);
  const el = document.createElement('playerstack-settings');
  host.appendChild(el);
  return { host, el };
}

/** Opens the menu (gear click) and returns the Speed top-level menu-item button. */
function openSpeedMenu(el: HTMLElement): HTMLButtonElement {
  const root = el.shadowRoot as ShadowRoot;
  const gear = root.querySelector('[part="settings-button"]') as HTMLButtonElement;
  gear.click();
  const items = Array.from(root.querySelectorAll('[part="menu-item"]')) as HTMLButtonElement[];
  const speed = items.find((item) => item.getAttribute('data-category') === 'speed');
  return speed as HTMLButtonElement;
}

describe('playerstack-settings', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Markup_Contract (Req 5.1, 5.2, 5.3)', () => {
    it('renders part="settings-button", part="menu" and part="submenu"', () => {
      const { el } = mount();
      const root = el.shadowRoot as ShadowRoot;

      const button = root.querySelector('[part="settings-button"]');
      expect(button).not.toBeNull();
      expect(button?.getAttribute('type')).toBe('button');
      expect(root.querySelector('.icon-settings')).not.toBeNull();
      expect(root.querySelector('[part="menu"]')).not.toBeNull();
      expect(root.querySelector('[part="submenu"]')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount();
      expect((el.shadowRoot as ShadowRoot).innerHTML).toMatchSnapshot();
    });
  });

  describe('open state + store→data-* propagation (Req 3.3)', () => {
    it('reflects data-open on the host when the menu toggles', () => {
      const { el } = mount();
      const gear = (el.shadowRoot as ShadowRoot).querySelector('[part="settings-button"]') as HTMLButtonElement;

      gear.click();
      expect(el.getAttribute('data-open')).toBe('true');

      gear.click();
      expect(el.getAttribute('data-open')).toBeNull();
    });

    it('marks the active speed submenu-item from the store playbackRate', () => {
      const { host, el } = mount();
      host.store.set({ playbackRate: 2 });

      const speed = openSpeedMenu(el);
      speed.click();

      const root = el.shadowRoot as ShadowRoot;
      const active = root.querySelector('[part="submenu-item"][data-active="true"]') as HTMLElement;
      expect(active).not.toBeNull();
      expect(active.getAttribute('data-value')).toBe('2');
    });
  });

  describe('request-event wiring (Req 2.1)', () => {
    it('emits playerstack-rate-request with the selected rate on a speed choice', () => {
      const { el } = mount();

      const speed = openSpeedMenu(el);
      speed.click();

      const root = el.shadowRoot as ShadowRoot;
      const items = Array.from(root.querySelectorAll('[part="submenu-item"]')) as HTMLButtonElement[];
      const choice = items.find((item) => item.getAttribute('data-value') === '2') as HTMLButtonElement;
      expect(choice).not.toBeUndefined();

      const received: Array<CustomEvent<{ rate: number }>> = [];
      document.addEventListener('playerstack-rate-request', (e) => received.push(e as CustomEvent<{ rate: number }>));

      choice.click();

      expect(received).toHaveLength(1);
      expect(received[0]?.detail.rate).toBe(2);
      expect(received[0]?.composed).toBe(true);
    });

    it('emits playerstack-quality-request with the selected value on a quality choice', () => {
      const { el } = mount();
      (el as unknown as { qualityOptions: Array<{ label: string; value: string }> }).qualityOptions = [
        { label: '1080p', value: '1080' },
        { label: '720p', value: '720' },
      ];

      const root = el.shadowRoot as ShadowRoot;
      const gear = root.querySelector('[part="settings-button"]') as HTMLButtonElement;
      gear.click();
      const menuItems = Array.from(root.querySelectorAll('[part="menu-item"]')) as HTMLButtonElement[];
      const quality = menuItems.find((item) => item.getAttribute('data-category') === 'quality') as HTMLButtonElement;
      expect(quality).not.toBeUndefined();
      quality.click();

      const choices = Array.from(root.querySelectorAll('[part="submenu-item"]')) as HTMLButtonElement[];
      const choice = choices.find((item) => item.getAttribute('data-value') === '720') as HTMLButtonElement;
      expect(choice).not.toBeUndefined();

      const received: Array<CustomEvent<{ value: string }>> = [];
      document.addEventListener('playerstack-quality-request', (e) =>
        received.push(e as CustomEvent<{ value: string }>),
      );

      choice.click();

      expect(received).toHaveLength(1);
      expect(received[0]?.detail.value).toBe('720');
      expect(received[0]?.composed).toBe(true);
      // Selecting closes the panel.
      expect(el.getAttribute('data-open')).toBeNull();
    });

    it('marks the active quality submenu-item from the store playbackQuality', () => {
      const { host, el } = mount();
      (el as unknown as { qualityOptions: Array<{ label: string; value: string }> }).qualityOptions = [
        { label: '1080p', value: '1080' },
        { label: '720p', value: '720' },
      ];
      host.store.set({ playbackQuality: 720 });

      const root = el.shadowRoot as ShadowRoot;
      const gear = root.querySelector('[part="settings-button"]') as HTMLButtonElement;
      gear.click();
      const quality = Array.from(root.querySelectorAll('[part="menu-item"]')).find(
        (item) => (item as HTMLElement).getAttribute('data-category') === 'quality',
      ) as HTMLButtonElement;
      quality.click();

      const active = root.querySelector('[part="submenu-item"][data-active="true"]') as HTMLElement;
      expect(active).not.toBeNull();
      expect(active.getAttribute('data-value')).toBe('720');
    });
  });

  describe('inputs (qualityOptions / i18n) accessors', () => {
    it('exposes and normalizes qualityOptions via the getter/setter', () => {
      const { el } = mount();
      const opts = [{ label: '720p', value: '720' }];
      (el as unknown as { qualityOptions: typeof opts }).qualityOptions = opts;
      expect((el as unknown as { qualityOptions: typeof opts }).qualityOptions).toEqual(opts);

      // A non-array assignment is normalized to an empty list.
      (el as unknown as { qualityOptions: unknown }).qualityOptions = null;
      expect((el as unknown as { qualityOptions: typeof opts }).qualityOptions).toEqual([]);
    });

    it('applies a custom i18n bag to the menu labels and exposes it via the getter', () => {
      const { el } = mount();
      const i18n = { speed: 'Velocidad', quality: 'Calidad', auto: 'Auto', normal: 'Normal' };
      (el as unknown as { i18n: typeof i18n | null }).i18n = i18n;
      expect((el as unknown as { i18n: typeof i18n | null }).i18n).toBe(i18n);

      const root = el.shadowRoot as ShadowRoot;
      const gear = root.querySelector('[part="settings-button"]') as HTMLButtonElement;
      gear.click();
      const speedItem = Array.from(root.querySelectorAll('[part="menu-item"]')).find(
        (item) => (item as HTMLElement).getAttribute('data-category') === 'speed',
      ) as HTMLElement;
      expect(speedItem.textContent).toBe('Velocidad');

      // Resetting to null restores the English default label.
      (el as unknown as { i18n: typeof i18n | null }).i18n = null;
      expect((el as unknown as { i18n: typeof i18n | null }).i18n).toBeNull();
    });
  });
});
