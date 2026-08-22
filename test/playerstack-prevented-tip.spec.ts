import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';
import { getTranslations } from '@i18n/index';

/**
 * Spec for `playerstack-prevented-tip` — the blocked-playback tip UI_Element (Req 3.3, 5.1,
 * 5.2, 5.3, 17.5). It verifies the Markup_Contract (`part="prevented-tip"` with a
 * `part="prevented-tip-message"` region), i18n resolution of the tip text, and store→data-*
 * propagation: the tip text stays rendered and a kernel error reflects `data-active` (Req 3.3).
 */
registerPlayerstackElements();

/** Creates a connected controller host and a prevented-tip child wired to its store. */
function mount(language?: string): { host: PlayerstackMediaController; el: HTMLElement } {
  const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
  document.body.appendChild(host);
  const el = document.createElement('playerstack-prevented-tip');
  if (language !== undefined) {
    el.setAttribute('language', language);
  }
  host.appendChild(el);
  return { host, el };
}

describe('playerstack-prevented-tip', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Markup_Contract (Req 5.1, 5.2, 5.3)', () => {
    it('renders part="prevented-tip" with a part="prevented-tip-message" region carrying the i18n tip', () => {
      const { el } = mount('en');
      const root = el;

      expect(root.querySelector('[part="prevented-tip"]')).not.toBeNull();
      const message = root.querySelector('[part="prevented-tip-message"]');
      expect(message).not.toBeNull();
      expect(message?.textContent).toBe(getTranslations('en').clickToUnmute);
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount('en');
      expect((el).innerHTML).toMatchSnapshot();
    });
  });

  describe('store→data-* propagation (Req 3.3)', () => {
    it('reflects data-active true on kernelError and false when cleared', () => {
      const { host, el } = mount('en');

      host.store.set({ kernelError: new Error('x') });
      expect(el.getAttribute('data-active')).toBe('true');

      host.store.set({ kernelError: null });
      expect(el.getAttribute('data-active')).toBe('false');
    });
  });
});
