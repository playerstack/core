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
      const root = el;

      expect(root.querySelector('[part="time-slider"]')).not.toBeNull();
      expect(root.querySelector('[part="slider"]')).not.toBeNull();
      expect(root.querySelector('[part="track"]')).not.toBeNull();
      expect(root.querySelector('[part="track-buffered"]')).not.toBeNull();
      expect(root.querySelector('[part="track-fill"]')).not.toBeNull();
      expect(root.querySelector('[part="thumb"]')).not.toBeNull();
      expect(root.querySelector('[part="tooltip"]')).not.toBeNull();
      expect(root.querySelector('[part="tooltip-time"]')).not.toBeNull();
      expect(root.querySelector('[part="tooltip-chapter"]')).not.toBeNull();
      expect(root.querySelector('[part="timelens"]')).not.toBeNull();
    });

    it('matches the rendered shadow markup snapshot', () => {
      const { el } = mount();
      expect((el).innerHTML).toMatchSnapshot();
    });
  });

  describe('store→data-* propagation (Req 3.3)', () => {
    it('updates the played and buffered fill widths from the store progress', () => {
      const { host, el } = mount();
      const root = el;
      const fill = root.querySelector('[part="track-fill"]') as HTMLElement;
      const buffered = root.querySelector('[part="track-buffered"]') as HTMLElement;

      host.store.set({ duration: 100, seek: 25, loaded: 50 });

      expect(fill.style.width).toBe('25%');
      expect(buffered.style.width).toBe('50%');
    });

    it('clamps the played fill width to 100% when seek exceeds duration', () => {
      const { host, el } = mount();
      const fill = (el).querySelector('[part="track-fill"]') as HTMLElement;

      host.store.set({ duration: 100, seek: 200 });

      expect(fill.style.width).toBe('100%');
    });

    // Regression (thumb positioning): the thumb `left` must ride the played fraction so it sits
    // at the end of the played fill — previously the thumb was never positioned with playback.
    it('positions the thumb left at the played fraction', () => {
      const { host, el } = mount();
      const thumb = (el).querySelector('[part="thumb"]') as HTMLElement;

      host.store.set({ duration: 100, seek: 25 });
      expect(thumb.style.left).toBe('25%');

      host.store.set({ duration: 100, seek: 80 });
      expect(thumb.style.left).toBe('80%');
    });

    it('clamps the thumb left to 100% when seek exceeds duration', () => {
      const { host, el } = mount();
      const thumb = (el).querySelector('[part="thumb"]') as HTMLElement;

      host.store.set({ duration: 100, seek: 200 });
      expect(thumb.style.left).toBe('100%');
    });
  });

  describe('request-event wiring (Req 2.1)', () => {
    it('emits playerstack-seek-request with the hovered time on pointerup', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });

      const root = el;
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
      const root = el;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue({ ...RECT_100, width: 0 });

      const received: Event[] = [];
      document.addEventListener('playerstack-seek-request', (e) => received.push(e));
      slider.dispatchEvent(new MouseEvent('pointerup', { clientX: 50, bubbles: true }));

      expect(received).toHaveLength(0);
    });
  });

  describe('press-and-drag scrubbing (Req 2.1, 3.3)', () => {
    it('updates the optimistic fill/thumb on drag and emits seek only on release', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100, seek: 10 });
      const root = el;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      const fill = root.querySelector('[part="track-fill"]') as HTMLElement;
      const thumb = root.querySelector('[part="thumb"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);

      const seeks: number[] = [];
      document.addEventListener('playerstack-seek-request', (e) =>
        seeks.push((e as CustomEvent<{ time: number }>).detail.time),
      );

      // Press at 30 -> optimistic fill/thumb move to 30%, host reflects data-time-sliding, no seek yet.
      slider.dispatchEvent(new MouseEvent('pointerdown', { clientX: 30, bubbles: true }));
      expect(el.getAttribute('data-time-sliding')).toBe('true');
      expect(fill.style.width).toBe('30%');
      expect(thumb.style.left).toBe('30%');
      expect(seeks).toHaveLength(0);

      // Move to 70 -> optimistic fill/thumb follow, still no seek emitted.
      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 70, bubbles: true }));
      expect(fill.style.width).toBe('70%');
      expect(thumb.style.left).toBe('70%');
      expect(seeks).toHaveLength(0);

      // Release at 70 -> emits the final seek and clears the sliding flag.
      slider.dispatchEvent(new MouseEvent('pointerup', { clientX: 70, bubbles: true }));
      expect(seeks).toEqual([70]);
      expect(el.hasAttribute('data-time-sliding')).toBe(false);
    });

    it('ignores optimistic drag moves when not pressed (hover only)', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100, seek: 40 });
      const root = el;
      const slider = root.querySelector('[part="slider"]') as HTMLElement;
      const track = root.querySelector('[part="track"]') as HTMLElement;
      const fill = root.querySelector('[part="track-fill"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);

      // A hover move (no press) must NOT move the played fill off the store position.
      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 90, bubbles: true }));
      expect(fill.style.width).toBe('40%');
      expect(el.hasAttribute('data-time-sliding')).toBe(false);
    });
  });

  describe('chapter segments (Req 1.6, 3.3)', () => {
    const chapters = [
      { title: 'Intro', startTime: 0 },
      { title: 'Middle', startTime: 40 },
      { title: 'End', startTime: 80 },
    ];

    it('renders a chapter-segment divider per chapter with width from computeChapterSegments', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      (el as unknown as { chapters: typeof chapters }).chapters = chapters;

      const overlay = el.querySelector('[part="chapters"]') as HTMLElement;
      const segments = overlay.querySelectorAll('[part="chapter-segment"]');
      expect(segments).toHaveLength(3);
      // 0-40, 40-80, 80-100 of a 100s duration.
      expect((segments[0] as HTMLElement).style.width).toBe('40%');
      expect((segments[1] as HTMLElement).style.width).toBe('40%');
      expect((segments[2] as HTMLElement).style.width).toBe('20%');
      expect(overlay.style.display).toBe('flex');
      expect((segments[0] as HTMLElement).title).toBe('Intro');
    });

    it('hides the chapters overlay when no markers are provided', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      const overlay = el.querySelector('[part="chapters"]') as HTMLElement;
      expect(overlay.style.display).toBe('none');
      expect(overlay.querySelectorAll('[part="chapter-segment"]')).toHaveLength(0);
    });

    it('recomputes segments when the duration changes', () => {
      const { host, el } = mount();
      (el as unknown as { chapters: typeof chapters }).chapters = chapters;
      // No duration yet -> no segments.
      const overlay = el.querySelector('[part="chapters"]') as HTMLElement;
      expect(overlay.querySelectorAll('[part="chapter-segment"]')).toHaveLength(0);

      host.store.set({ duration: 200 });
      const segments = overlay.querySelectorAll('[part="chapter-segment"]');
      expect(segments).toHaveLength(3);
      // 0-40 of 200 = 20%.
      expect((segments[0] as HTMLElement).style.width).toBe('20%');
    });

    it('exposes assigned chapters via the getter', () => {
      const { el } = mount();
      (el as unknown as { chapters: typeof chapters }).chapters = chapters;
      expect((el as unknown as { chapters: typeof chapters }).chapters).toBe(chapters);
    });

    // Regression (per-segment fills): each chapter block paints its OWN buffered + played fill
    // computed per the original ChapterSegments formulas (100 past the end, a linear share
    // inside, 0 before), and the plain track-fill/buffered must NOT double-paint.
    it('paints each segment its own played + buffered fill and zeroes the plain track fills', () => {
      const { host, el } = mount();
      (el as unknown as { chapters: typeof chapters }).chapters = chapters;
      // duration 100, segments 0-40 / 40-80 / 80-100. seek=50 (mid seg 1), loaded=90 (into seg 2).
      host.store.set({ duration: 100, seek: 50, loaded: 90 });

      const blocks = el.querySelectorAll('[part="chapter-segment"]');
      const filled = el.querySelectorAll('[part="chapter-segment-filled"]');
      const buffered = el.querySelectorAll('[part="chapter-segment-buffered"]');
      expect(blocks).toHaveLength(3);

      // Played (seek=50): seg0 fully filled (100), seg1 = (50-40)/40 = 25, seg2 = 0.
      expect((filled[0] as HTMLElement).style.width).toBe('100%');
      expect((filled[1] as HTMLElement).style.width).toBe('25%');
      expect((filled[2] as HTMLElement).style.width).toBe('0%');

      // Buffered (loaded=90): seg0 100, seg1 100, seg2 = (90-80)/20 = 50.
      expect((buffered[0] as HTMLElement).style.width).toBe('100%');
      expect((buffered[1] as HTMLElement).style.width).toBe('100%');
      expect((buffered[2] as HTMLElement).style.width).toBe('50%');

      // Plain track fills must be zeroed so only the segments show progress.
      const plainFill = el.querySelector('[part="track-fill"]') as HTMLElement;
      const plainBuffered = el.querySelector('[part="track-buffered"]') as HTMLElement;
      expect(plainFill.style.width).toBe('0%');
      expect(plainBuffered.style.width).toBe('0%');
    });

    // Regression (hovered segment marker): a pointermove marks the segment under the pointer
    // with `data-hovered` (so the Style_Layer scales it), and a pointerleave clears it.
    it('marks the hovered segment on pointermove and clears it on pointerleave', () => {
      const { host, el } = mount();
      (el as unknown as { chapters: typeof chapters }).chapters = chapters;
      host.store.set({ duration: 100 });
      const slider = el.querySelector('[part="slider"]') as HTMLElement;
      const track = el.querySelector('[part="track"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);
      const blocks = el.querySelectorAll('[part="chapter-segment"]');

      // Hover at clientX=50 -> time 50 -> segment index 1 (40-80) is hovered.
      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, bubbles: true }));
      expect((blocks[1] as HTMLElement).hasAttribute('data-hovered')).toBe(true);
      expect((blocks[0] as HTMLElement).hasAttribute('data-hovered')).toBe(false);

      // Move to clientX=10 -> time 10 -> segment index 0; the previous marker moves.
      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, bubbles: true }));
      expect((blocks[0] as HTMLElement).hasAttribute('data-hovered')).toBe(true);
      expect((blocks[1] as HTMLElement).hasAttribute('data-hovered')).toBe(false);

      // Leaving the slider clears any hovered marker.
      slider.dispatchEvent(new MouseEvent('pointerleave', { bubbles: true }));
      expect((blocks[0] as HTMLElement).hasAttribute('data-hovered')).toBe(false);
    });

    // Regression (tooltip chapter label): when chapters exist, hovering surfaces the hovered
    // chapter's TITLE in the tooltip (StyledChapterLabel) alongside the time.
    it('shows the hovered chapter title in the tooltip at the hovered time', () => {
      const { host, el } = mount();
      (el as unknown as { chapters: typeof chapters }).chapters = chapters;
      host.store.set({ duration: 100 });
      const slider = el.querySelector('[part="slider"]') as HTMLElement;
      const track = el.querySelector('[part="track"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);
      const chapterLabel = el.querySelector('[part="tooltip-chapter"]') as HTMLElement;
      const timeLine = el.querySelector('[part="tooltip-time"]') as HTMLElement;

      // Hover at 50s -> Middle chapter (40-80), time 00:50.
      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, bubbles: true }));
      expect(chapterLabel.textContent).toBe('Middle');
      expect(chapterLabel.style.display).toBe('block');
      expect(timeLine.textContent).toBe('00:50');

      // Hover at 10s -> Intro chapter (0-40).
      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, bubbles: true }));
      expect(chapterLabel.textContent).toBe('Intro');
    });

    it('hides the tooltip chapter label when there are no chapters', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      const slider = el.querySelector('[part="slider"]') as HTMLElement;
      const track = el.querySelector('[part="track"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);
      const chapterLabel = el.querySelector('[part="tooltip-chapter"]') as HTMLElement;

      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, bubbles: true }));
      expect(chapterLabel.style.display).toBe('none');
      expect(chapterLabel.textContent).toBe('');
    });
  });

  describe('ad mode (parity: slider becomes the yellow ad progress bar)', () => {
    const chapters = [
      { title: 'Intro', startTime: 0 },
      { title: 'Middle', startTime: 40 },
      { title: 'End', startTime: 80 },
    ];

    // Regression: in ad mode the chapter segments must NOT render (the ORIGINAL rendered the plain
    // `adMode` track and no ChapterSegments during an ad), the handle is hidden and the cursor is
    // default, while the plain track-fill still carries the (yellow, via CSS) ad progress.
    it('hides chapter segments and the handle, sets default cursor, and keeps the plain fill', () => {
      const { host, el } = mount();
      (el as unknown as { chapters: typeof chapters }).chapters = chapters;
      host.store.set({ duration: 100, seek: 50, loaded: 60 });

      // Sanity: chapters render before ad mode.
      const overlay = el.querySelector('[part="chapters"]') as HTMLElement;
      expect(overlay.querySelectorAll('[part="chapter-segment"]')).toHaveLength(3);

      (el as unknown as { adMode: boolean }).adMode = true;

      // Chapters gone / overlay hidden; markers ignored.
      expect(overlay.querySelectorAll('[part="chapter-segment"]')).toHaveLength(0);
      expect(overlay.style.display).toBe('none');
      expect(el.hasAttribute('data-has-chapters')).toBe(false);

      // Handle hidden + default cursor.
      const thumb = el.querySelector('[part="thumb"]') as HTMLElement;
      const slider = el.querySelector('[part="slider"]') as HTMLElement;
      expect(thumb.style.display).toBe('none');
      expect(slider.style.cursor).toBe('default');

      // The plain track-fill (tinted yellow by the controller `[data-ad-active]` CSS) carries the
      // ad progress: 50/100 = 50%.
      const fill = el.querySelector('[part="track-fill"]') as HTMLElement;
      expect(fill.style.width).toBe('50%');
    });

    // Regression: leaving ad mode restores chapters + handle + the normal (red, via CSS) fill.
    it('restores chapters, handle and cursor when ad mode ends', () => {
      const { host, el } = mount();
      (el as unknown as { chapters: typeof chapters }).chapters = chapters;
      host.store.set({ duration: 100, seek: 50 });
      (el as unknown as { adMode: boolean }).adMode = true;
      (el as unknown as { adMode: boolean }).adMode = false;

      const overlay = el.querySelector('[part="chapters"]') as HTMLElement;
      expect(overlay.querySelectorAll('[part="chapter-segment"]')).toHaveLength(3);
      expect(overlay.style.display).toBe('flex');

      const thumb = el.querySelector('[part="thumb"]') as HTMLElement;
      const slider = el.querySelector('[part="slider"]') as HTMLElement;
      expect(thumb.style.display).toBe('');
      expect(slider.style.cursor).toBe('');
    });

    it('exposes the adMode flag via the getter', () => {
      const { el } = mount();
      expect((el as unknown as { adMode: boolean }).adMode).toBe(false);
      (el as unknown as { adMode: boolean }).adMode = true;
      expect((el as unknown as { adMode: boolean }).adMode).toBe(true);
    });

    // Regression: seeking/scrubbing is DISABLED in ad mode — the ad position cannot be changed
    // via the timeline (parity with the original `adMode` slider). Neither a click nor a drag
    // emits `playerstack-seek-request`.
    it('does NOT emit a seek on click or drag while in ad mode', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      (el as unknown as { adMode: boolean }).adMode = true;

      const slider = el.querySelector('[part="slider"]') as HTMLElement;
      const track = el.querySelector('[part="track"]') as HTMLElement;
      jest.spyOn(track, 'getBoundingClientRect').mockReturnValue(RECT_100);

      const seeks: Event[] = [];
      document.addEventListener('playerstack-seek-request', (e) => seeks.push(e));

      slider.dispatchEvent(new MouseEvent('pointerdown', { clientX: 30, bubbles: true }));
      slider.dispatchEvent(new MouseEvent('pointermove', { clientX: 70, bubbles: true }));
      slider.dispatchEvent(new MouseEvent('pointerup', { clientX: 70, bubbles: true }));

      expect(seeks).toHaveLength(0);
      // No drag was started, so no sliding flag either.
      expect(el.hasAttribute('data-time-sliding')).toBe(false);
    });
  });

  describe('hover affordances (tooltip + timelens)', () => {
    it('positions and shows the time tooltip on pointermove', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      const root = el;
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
      const root = el;
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
      const root = el;
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
      const root = el;
      const timelens = root.querySelector('[part="timelens"]') as HTMLElement;
      (el as unknown as { spriteData: typeof spriteData | null }).spriteData = spriteData;
      (el as unknown as { spriteData: typeof spriteData | null }).spriteData = null;
      expect(timelens.style.display).toBe('none');
    });

    it('positions and shows the timelens frame on pointermove when spriteData is present', () => {
      const { host, el } = mount();
      host.store.set({ duration: 100 });
      const root = el;
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
      const root = el;
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
