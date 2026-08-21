import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';

/**
 * Spec for `playerstack-context-menu` — the right-click loop / PiP / fullscreen menu
 * UI_Element (Req 3.3, 5.1, 5.2, 5.3, 17.5). It verifies the Markup_Contract (`part="context-
 * menu"` with `role="menu"` holding one `part="context-menu-item"` `role="menuitem"` per
 * action), the open/close behavior (`data-open` on right-click; Escape / document click
 * close), and request-event wiring: the loop item emits `playerstack-loop-request` with the
 * NEXT loop value, and the PiP/fullscreen items emit enter/exit based on store state (Req 2.1).
 */
registerPlayerstackElements();

/** Creates a connected controller host and a context-menu child wired to its store. */
function mount(): { host: PlayerstackMediaController; el: HTMLElement } {
  const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
  document.body.appendChild(host);
  const el = document.createElement('playerstack-context-menu');
  host.appendChild(el);
  return { host, el };
}

/** Returns the menu item button for a given action from the element's shadow root. */
function itemFor(el: HTMLElement, action: string): HTMLButtonElement {
  return (el.shadowRoot as ShadowRoot).querySelector(`[data-action="${action}"]`) as HTMLButtonElement;
}

describe('playerstack-context-menu', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Markup_Contract + ARIA roles (Req 1.5, 5.1, 5.2, 5.3)', () => {
    it('renders part="context-menu" role=menu with a menuitem per action', () => {
      const { el } = mount();
      const root = el.shadowRoot as ShadowRoot;

      const menu = root.querySelector('[part="context-menu"]');
      expect(menu).not.toBeNull();
      expect(menu?.getAttribute('role')).toBe('menu');

      const items = root.querySelectorAll('[part="context-menu-item"]');
      expect(items).toHaveLength(3);
      items.forEach((item) => expect(item.getAttribute('role')).toBe('menuitem'));

      expect(itemFor(el, 'loop')).not.toBeNull();
      expect(itemFor(el, 'pip')).not.toBeNull();
      expect(itemFor(el, 'fullscreen')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount();
      expect((el.shadowRoot as ShadowRoot).innerHTML).toMatchSnapshot();
    });
  });

  describe('open/close behavior (Req 3.3)', () => {
    it('opens on right-click (data-open) and closes on Escape', () => {
      const { el } = mount();

      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 20 }));
      expect(el.getAttribute('data-open')).toBe('true');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(el.getAttribute('data-open')).toBeNull();
    });

    it('closes on a document click', () => {
      const { el } = mount();

      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 20 }));
      expect(el.getAttribute('data-open')).toBe('true');

      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(el.getAttribute('data-open')).toBeNull();
    });
  });

  describe('request-event wiring (Req 2.1)', () => {
    it('loop item emits playerstack-loop-request with the opposite of the store loop', () => {
      const { host, el } = mount();
      host.store.set({ loop: false });

      const received: Array<CustomEvent<{ loop: boolean }>> = [];
      document.addEventListener('playerstack-loop-request', (e) => received.push(e as CustomEvent<{ loop: boolean }>));

      itemFor(el, 'loop').click();

      expect(received).toHaveLength(1);
      expect(received[0]?.detail.loop).toBe(true);
    });

    it('pip item emits enter-pip when not in PiP and exit-pip when in PiP', () => {
      const { host, el } = mount();

      const enter: CustomEvent[] = [];
      const exit: CustomEvent[] = [];
      document.addEventListener('playerstack-enter-pip-request', (e) => enter.push(e as CustomEvent));
      document.addEventListener('playerstack-exit-pip-request', (e) => exit.push(e as CustomEvent));

      host.store.set({ isPIP: false });
      itemFor(el, 'pip').click();
      expect(enter).toHaveLength(1);
      expect(exit).toHaveLength(0);

      host.store.set({ isPIP: true });
      itemFor(el, 'pip').click();
      expect(exit).toHaveLength(1);
    });

    it('fullscreen item emits enter/exit based on store fullscreen state', () => {
      const { host, el } = mount();

      const enter: CustomEvent[] = [];
      const exit: CustomEvent[] = [];
      document.addEventListener('playerstack-enter-fullscreen-request', (e) => enter.push(e as CustomEvent));
      document.addEventListener('playerstack-exit-fullscreen-request', (e) => exit.push(e as CustomEvent));

      host.store.set({ isFullScreen: false });
      itemFor(el, 'fullscreen').click();
      expect(enter).toHaveLength(1);

      host.store.set({ isFullScreen: true });
      itemFor(el, 'fullscreen').click();
      expect(exit).toHaveLength(1);
    });
  });

  describe('i18n labels', () => {
    it('applies custom labels via the i18n setter and exposes them via the getter', () => {
      const { el } = mount();
      const i18n = { loop: 'Repetir', pip: 'Imagen en imagen', fullscreen: 'Pantalla completa' };
      (el as unknown as { i18n: typeof i18n | null }).i18n = i18n;

      expect((el as unknown as { i18n: typeof i18n | null }).i18n).toBe(i18n);
      expect(itemFor(el, 'loop').textContent).toBe('Repetir');
      expect(itemFor(el, 'pip').textContent).toBe('Imagen en imagen');
      expect(itemFor(el, 'fullscreen').textContent).toBe('Pantalla completa');

      // Resetting to null restores the English defaults.
      (el as unknown as { i18n: typeof i18n | null }).i18n = null;
      expect(itemFor(el, 'loop').textContent).toBe('Loop');
    });
  });

  describe('active markers from store state present before connect', () => {
    it('marks items active from the store state resolved at render', () => {
      const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
      document.body.appendChild(host);
      host.store.set({ loop: true, isPIP: true, isFullScreen: true });

      const el = document.createElement('playerstack-context-menu');
      host.appendChild(el); // connect: render paints active markers from the resolved store state

      expect(itemFor(el, 'loop').getAttribute('data-active')).toBe('true');
      expect(itemFor(el, 'pip').getAttribute('data-active')).toBe('true');
      expect(itemFor(el, 'fullscreen').getAttribute('data-active')).toBe('true');
    });
  });
});
