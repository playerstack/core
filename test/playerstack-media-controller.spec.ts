import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';
import { requestMediaContext } from '@ui/media-context';
import type { MediaContext } from '@typings/ui/media-context.types';

/**
 * Spec for `playerstack-media-controller` — the ROOT host element (Req 5.1, 5.3). It
 * verifies the Markup_Contract (Shadow DOM `part`s + `<slot>`), the single global token
 * injection per document (Req 3.10), the media-context wiring it provides to descendants
 * (Req 2.2/2.3), and that its `store` getter returns a working `MediaStore`.
 *
 * Registration goes through `registerPlayerstackElements()` so we also exercise the
 * default-table path (the table now includes this element). The registry forbids
 * re-defining a name, so registration is idempotent and safe to call once at module load.
 */
registerPlayerstackElements();

/** Convenience: create the upgraded, defined element instance typed. */
function createController(): PlayerstackMediaController {
  return document.createElement('playerstack-media-controller') as PlayerstackMediaController;
}

describe('playerstack-media-controller', () => {
  beforeEach(() => {
    // Remove the once-per-document global tokens marker so the "exactly once" assertions
    // in the tokens test are deterministic regardless of test ordering.
    document.head.querySelectorAll('style[data-playerstack-tokens]').forEach((node) => node.remove());
  });

  afterEach(() => {
    // Clean up any nodes left on the document body between tests.
    document.body.innerHTML = '';
  });

  describe('Markup_Contract (Req 5.1, 5.3)', () => {
    it('renders part="root", part="media", part="controls" and a <slot>', () => {
      const el = createController();
      document.body.appendChild(el);

      const root = el.shadowRoot as ShadowRoot;
      expect(root.querySelector('[part="root"]')).not.toBeNull();
      expect(root.querySelector('[part="media"]')).not.toBeNull();
      expect(root.querySelector('[part="controls"]')).not.toBeNull();
      expect(root.querySelector('slot')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const el = createController();
      document.body.appendChild(el);

      // The snapshot documents the stable Markup_Contract; it is written on first run.
      expect((el.shadowRoot as ShadowRoot).innerHTML).toMatchSnapshot();
    });
  });

  describe('global tokens injected exactly once per document (Req 3.10)', () => {
    it('injects a single tokens marker after connecting one controller', () => {
      const el = createController();
      document.body.appendChild(el);

      expect(document.head.querySelectorAll('style[data-playerstack-tokens]')).toHaveLength(1);
    });

    it('stays at exactly one tokens marker after connecting a second controller (idempotent)', () => {
      const first = createController();
      document.body.appendChild(first);
      expect(document.head.querySelectorAll('style[data-playerstack-tokens]')).toHaveLength(1);

      const second = createController();
      document.body.appendChild(second);

      // ensureGlobalTokens is once-per-document: a second host must not duplicate the marker.
      expect(document.head.querySelectorAll('style[data-playerstack-tokens]')).toHaveLength(1);
    });
  });

  describe('media context wiring (Req 2.2, 2.3)', () => {
    it('provides its own store to a descendant that requests the media context', () => {
      const el = createController();
      document.body.appendChild(el);

      // A plain descendant inside the controller requests context; the bubbling + composed
      // request event reaches the controller, which provides its shared store.
      const child = document.createElement('div');
      el.appendChild(child);

      let resolved: MediaContext | null = null;
      requestMediaContext(child, (context) => {
        resolved = context;
      });

      expect(resolved).not.toBeNull();
      expect((resolved as unknown as MediaContext).store).toBe(el.store);
    });
  });

  describe('attachController re-attach + render idempotency', () => {
    /** A conformant no-op adapter satisfying assertPlayerAdapter. */
    function makeAdapter(): Record<string, () => unknown> {
      const noop = (): void => undefined;
      return {
        play: noop,
        pause: noop,
        stop: noop,
        load: noop,
        seekTo: noop,
        setVolume: noop,
        mute: noop,
        unmute: noop,
        setPlaybackRate: noop,
        getDuration: () => 0,
        getCurrentTime: () => 0,
        getSecondsLoaded: () => 0,
      };
    }

    /** A minimal orchestrator stub exposing the on/off/destroy the MediaController uses. */
    function makeOrchestrator(): { on: jest.Mock; off: jest.Mock; destroy: jest.Mock } {
      return { on: jest.fn(), off: jest.fn(), destroy: jest.fn() };
    }

    it('destroys the previously attached controller when attachController is called again', () => {
      const el = createController();
      document.body.appendChild(el);

      const firstOrchestrator = makeOrchestrator();
      el.attachController({
        adapter: makeAdapter() as never,
        orchestrator: firstOrchestrator as never,
      });

      const secondOrchestrator = makeOrchestrator();
      // Re-attaching destroys the first controller (which destroys the first orchestrator).
      el.attachController({
        adapter: makeAdapter() as never,
        orchestrator: secondOrchestrator as never,
      });

      expect(firstOrchestrator.destroy).toHaveBeenCalledTimes(1);
    });

    it('keeps a single root structure across disconnect/reconnect (idempotent render)', () => {
      const el = createController();
      document.body.appendChild(el);
      el.remove();
      document.body.appendChild(el);

      const roots = (el.shadowRoot as ShadowRoot).querySelectorAll('[part="root"]');
      expect(roots).toHaveLength(1);
    });
  });

  describe('store getter (Req 2.3)', () => {
    it('returns a working MediaStore with getState/set/subscribe', () => {
      const el = createController();
      document.body.appendChild(el);

      const { store } = el;
      expect(typeof store.getState).toBe('function');
      expect(typeof store.set).toBe('function');
      expect(typeof store.subscribe).toBe('function');

      const seen: boolean[] = [];
      const unsubscribe = store.subscribe((state) => seen.push(state.playing));
      store.set({ playing: true });

      expect(store.getState().playing).toBe(true);
      expect(seen).toContain(true);

      unsubscribe();
    });
  });
});
