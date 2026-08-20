import { LiveDVRController } from '@live-dvr-controller';
import type { DVRAdapter } from '@typings/adapters.types';

function createMockAdapter(options: { start?: number; end?: number; currentTime?: number } = {}): DVRAdapter & { triggerTimeUpdate: () => void; setCurrentTime: (t: number) => void; setRange: (r: { start: number; end: number } | null) => void } {
  let range: { start: number; end: number } | null = options.start !== undefined && options.end !== undefined
    ? { start: options.start, end: options.end }
    : null;
  let currentTime = options.currentTime ?? 0;
  let callback: (() => void) | null = null;

  return {
    getSeekableRange: jest.fn(() => range),
    getCurrentTime: jest.fn(() => currentTime),
    seekTo: jest.fn(),
    onTimeUpdate: jest.fn((cb) => {
      callback = cb;
      return () => { callback = null; };
    }),
    triggerTimeUpdate() {
      if (callback) callback();
    },
    setCurrentTime(t: number) {
      currentTime = t;
    },
    setRange(r: { start: number; end: number } | null) {
      range = r;
    },
  };
}

describe('LiveDVRController', () => {
  describe('DVR state computation', () => {
    it('returns null state when no seekable range', () => {
      const adapter = createMockAdapter();
      const controller = new LiveDVRController(adapter);

      expect(controller.state).toBeNull();
      expect(controller.isAtLiveEdge).toBe(true);
      expect(controller.liveOffset).toBe('');

      controller.destroy();
    });

    it('returns null state when seekable window is below minimum (15s)', () => {
      const adapter = createMockAdapter({ start: 0, end: 10, currentTime: 5 });
      const controller = new LiveDVRController(adapter);

      expect(controller.state).toBeNull();
      controller.destroy();
    });

    it('computes valid DVR state from seekable range', () => {
      const adapter = createMockAdapter({ start: 100, end: 200, currentTime: 190 });
      const controller = new LiveDVRController(adapter);

      expect(controller.state).not.toBeNull();
      expect(controller.state!.hasDVR).toBe(true);
      expect(controller.state!.seekableStart).toBe(100);
      expect(controller.state!.seekableEnd).toBe(200);
      expect(controller.state!.seekableWindow).toBe(100);
      expect(controller.state!.sliderDuration).toBe(100);
      expect(controller.state!.sliderPosition).toBe(90); // 190 - 100

      controller.destroy();
    });
  });

  describe('live edge detection', () => {
    it('detects at live edge when within tolerance (10s)', () => {
      const adapter = createMockAdapter({ start: 0, end: 100, currentTime: 95 });
      const controller = new LiveDVRController(adapter);

      expect(controller.isAtLiveEdge).toBe(true);
      expect(controller.state!.isAtLiveEdge).toBe(true);

      controller.destroy();
    });

    it('detects NOT at live edge when behind tolerance', () => {
      const adapter = createMockAdapter({ start: 0, end: 100, currentTime: 50 });
      const controller = new LiveDVRController(adapter);

      expect(controller.isAtLiveEdge).toBe(false);
      expect(controller.state!.isAtLiveEdge).toBe(false);
      expect(controller.state!.liveEdgeOffset).toBe(-50); // 50 - 100

      controller.destroy();
    });

    it('computes liveOffset string when behind', () => {
      const adapter = createMockAdapter({ start: 0, end: 100, currentTime: 20 });
      const controller = new LiveDVRController(adapter);

      // 20 - 100 = -80s → "-1:20"
      expect(controller.liveOffset).toBe('-1:20');

      controller.destroy();
    });

    it('returns empty liveOffset when at live edge', () => {
      const adapter = createMockAdapter({ start: 0, end: 100, currentTime: 95 });
      const controller = new LiveDVRController(adapter);

      expect(controller.liveOffset).toBe('');

      controller.destroy();
    });
  });

  describe('seekToLive()', () => {
    it('seeks to the end of seekable range', () => {
      const adapter = createMockAdapter({ start: 0, end: 200, currentTime: 100 });
      const controller = new LiveDVRController(adapter);

      controller.seekToLive();
      expect(adapter.seekTo).toHaveBeenCalledWith(200);

      controller.destroy();
    });

    it('does nothing after destroy', () => {
      const adapter = createMockAdapter({ start: 0, end: 200, currentTime: 100 });
      const controller = new LiveDVRController(adapter);
      controller.destroy();

      controller.seekToLive();
      expect(adapter.seekTo).not.toHaveBeenCalled();
    });
  });

  describe('seekToDVRPosition()', () => {
    it('converts slider position to absolute time and seeks', () => {
      const adapter = createMockAdapter({ start: 100, end: 200, currentTime: 150 });
      const controller = new LiveDVRController(adapter);

      // Slider position 30 → absolute time 100 + 30 = 130
      controller.seekToDVRPosition(30);
      expect(adapter.seekTo).toHaveBeenCalledWith(130);

      controller.destroy();
    });

    it('does nothing when state is null', () => {
      const adapter = createMockAdapter();
      const controller = new LiveDVRController(adapter);

      controller.seekToDVRPosition(50);
      expect(adapter.seekTo).not.toHaveBeenCalled();

      controller.destroy();
    });
  });

  describe('dvrStateChange event', () => {
    it('emits on initial computation', () => {
      const handler = jest.fn();
      const adapter = createMockAdapter({ start: 0, end: 100, currentTime: 50 });
      const controller = new LiveDVRController(adapter);
      // The initial _update fires in constructor — subscribe after to test triggerTimeUpdate
      controller.on('dvrStateChange', handler);

      adapter.setCurrentTime(60);
      adapter.triggerTimeUpdate();

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        hasDVR: true,
        sliderPosition: 60,
      }));

      controller.destroy();
    });

    it('emits null when range disappears', () => {
      const adapter = createMockAdapter({ start: 0, end: 100, currentTime: 50 });
      const controller = new LiveDVRController(adapter);
      const handler = jest.fn();
      controller.on('dvrStateChange', handler);

      adapter.setRange(null);
      adapter.triggerTimeUpdate();

      expect(handler).toHaveBeenCalledWith(null);

      controller.destroy();
    });
  });

  describe('destroy()', () => {
    it('unsubscribes from adapter time updates', () => {
      const adapter = createMockAdapter({ start: 0, end: 100, currentTime: 50 });
      const controller = new LiveDVRController(adapter);
      const handler = jest.fn();
      controller.on('dvrStateChange', handler);

      controller.destroy();

      adapter.setCurrentTime(60);
      adapter.triggerTimeUpdate();
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
