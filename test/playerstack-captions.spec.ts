import { PlayerstackMediaController } from '@ui/elements/playerstack-media-controller';
import { registerPlayerstackElements } from '@ui/register';
import type { VTTCue } from '@typings/utils/captions.types';

/**
 * Spec for `playerstack-captions` — the caption overlay UI_Element (Req 3.3, 5.1, 5.2, 5.3,
 * 17.5). It verifies the Markup_Contract (`part="captions"` container with a `part="cue"`
 * region), store→display propagation (the active cue text appears when `seek` lands inside a
 * cue) and the reflected `data-active` state (Req 3.3).
 *
 * The element resolves the media context from an ancestor `playerstack-media-controller`, so
 * every test appends it as a light-DOM child of a connected controller and drives state via
 * `host.store`.
 */
registerPlayerstackElements();

/** A single parsed cue matching the real `VTTCue` shape (`startTime`/`endTime`/`text`). */
const CUES: VTTCue[] = [{ startTime: 0, endTime: 5, text: 'Hello' }];

/** Creates a connected controller host and a captions child wired to its store. */
function mount(): { host: PlayerstackMediaController; el: HTMLElement } {
  const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
  document.body.appendChild(host);
  const el = document.createElement('playerstack-captions');
  host.appendChild(el);
  return { host, el };
}

describe('playerstack-captions', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Markup_Contract (Req 5.1, 5.2, 5.3)', () => {
    it('renders part="captions" with a part="cue" region', () => {
      const { el } = mount();
      const root = el;

      expect(root.querySelector('[part="captions"]')).not.toBeNull();
      expect(root.querySelector('[part="cue"]')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount();
      (el as unknown as { captionsSrc: VTTCue[] }).captionsSrc = CUES;
      (el.parentElement as PlayerstackMediaController).store.set({ seek: 2 });
      expect((el).innerHTML).toMatchSnapshot();
    });
  });

  describe('store→display propagation (Req 3.3)', () => {
    it('shows the active cue text in part="cue" and reflects data-active when seek is inside a cue', () => {
      const { host, el } = mount();
      (el as unknown as { captionsSrc: VTTCue[] }).captionsSrc = CUES;

      host.store.set({ seek: 2 });

      const cue = (el).querySelector('[part="cue"]');
      expect(cue?.textContent).toBe('Hello');
      expect(el.getAttribute('data-active')).toBe('true');
    });

    it('clears the cue text and reflects data-active false when seek is outside every cue', () => {
      const { host, el } = mount();
      (el as unknown as { captionsSrc: VTTCue[] }).captionsSrc = CUES;

      host.store.set({ seek: 10 });

      const cue = (el).querySelector('[part="cue"]');
      expect(cue?.textContent).toBe('');
      expect(el.getAttribute('data-active')).toBe('false');
    });
  });

  describe('captionsSrc source handling (Req 1.6)', () => {
    it('parses a raw VTT string source into cues', () => {
      const { host, el } = mount();
      const vtt = 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nParsed line\n';
      (el as unknown as { captionsSrc: string }).captionsSrc = vtt;

      host.store.set({ seek: 2 });

      const cue = (el).querySelector('[part="cue"]');
      expect(cue?.textContent).toBe('Parsed line');
    });

    it('exposes the tracked cues via the getter', () => {
      const { el } = mount();
      (el as unknown as { captionsSrc: VTTCue[] | null }).captionsSrc = CUES;
      expect((el as unknown as { captionsSrc: VTTCue[] | null }).captionsSrc).toEqual(CUES);
    });

    it('clears the cues when the source is set to null', () => {
      const { host, el } = mount();
      (el as unknown as { captionsSrc: VTTCue[] | null }).captionsSrc = CUES;
      (el as unknown as { captionsSrc: VTTCue[] | null }).captionsSrc = null;

      host.store.set({ seek: 2 });

      const cue = (el).querySelector('[part="cue"]');
      expect(cue?.textContent).toBe('');
      expect(el.getAttribute('data-active')).toBe('false');
    });

    it('paints from a source assigned and store state present before connect', () => {
      // Assigning the source while detached exercises the pre-render guard in
      // updateActiveCue; connecting under a host whose store already has a matching
      // seek paints the cue from the resolved context on render.
      const host = document.createElement('playerstack-media-controller') as PlayerstackMediaController;
      document.body.appendChild(host);
      host.store.set({ seek: 2 });

      const el = document.createElement('playerstack-captions');
      (el as unknown as { captionsSrc: VTTCue[] }).captionsSrc = CUES; // detached: guard path
      host.appendChild(el); // connect: render paints from the resolved store state

      const cue = (el).querySelector('[part="cue"]');
      expect(cue?.textContent).toBe('Hello');
    });
  });

  describe('caption-track selection request (Req 2.1, 21.1)', () => {
    it('dispatches playerstack-caption-request with the selected value from selectCaption', () => {
      const { el } = mount();

      const received: CustomEvent[] = [];
      document.addEventListener('playerstack-caption-request', (e) => received.push(e as CustomEvent));

      (el as unknown as { selectCaption(value: string): void }).selectCaption('es');

      expect(received).toHaveLength(1);
      expect(received[0]?.detail).toEqual({ value: 'es' });
      expect(received[0]?.bubbles).toBe(true);
      expect(received[0]?.composed).toBe(true);
    });
  });
});
