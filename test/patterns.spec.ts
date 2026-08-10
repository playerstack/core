import { canPlay, VIDEO_EXTENSIONS, HLS_EXTENSIONS, DASH_EXTENSIONS, FLV_EXTENSIONS } from '../src/patterns';

describe('patterns', () => {
  describe('VIDEO_EXTENSIONS', () => {
    it('matches common video extensions', () => {
      expect(VIDEO_EXTENSIONS.test('video.mp4')).toBe(true);
      expect(VIDEO_EXTENSIONS.test('video.webm')).toBe(true);
      expect(VIDEO_EXTENSIONS.test('video.ogg')).toBe(true);
      expect(VIDEO_EXTENSIONS.test('video.ogv')).toBe(true);
      expect(VIDEO_EXTENSIONS.test('video.mov')).toBe(true);
      expect(VIDEO_EXTENSIONS.test('video.m4v')).toBe(true);
    });

    it('matches with query strings', () => {
      expect(VIDEO_EXTENSIONS.test('video.mp4?token=abc')).toBe(true);
    });

    it('does not match non-video extensions', () => {
      expect(VIDEO_EXTENSIONS.test('file.txt')).toBe(false);
      expect(VIDEO_EXTENSIONS.test('file.m3u8')).toBe(false);
    });
  });

  describe('HLS_EXTENSIONS', () => {
    it('matches .m3u8', () => {
      expect(HLS_EXTENSIONS.test('stream.m3u8')).toBe(true);
      expect(HLS_EXTENSIONS.test('stream.m3u8?key=val')).toBe(true);
    });

    it('does not match other formats', () => {
      expect(HLS_EXTENSIONS.test('video.mp4')).toBe(false);
    });
  });

  describe('DASH_EXTENSIONS', () => {
    it('matches .mpd', () => {
      expect(DASH_EXTENSIONS.test('manifest.mpd')).toBe(true);
    });
  });

  describe('FLV_EXTENSIONS', () => {
    it('matches .flv', () => {
      expect(FLV_EXTENSIONS.test('video.flv')).toBe(true);
    });
  });

  describe('canPlay', () => {
    it('returns true for known video extensions', () => {
      expect(canPlay('https://cdn.example.com/video.mp4')).toBe(true);
      expect(canPlay('stream.m3u8')).toBe(true);
      expect(canPlay('manifest.mpd')).toBe(true);
      expect(canPlay('video.flv')).toBe(true);
    });

    it('returns true when sources array is provided', () => {
      expect(canPlay(null, [{ src: 'a.mp4' }])).toBe(true);
    });

    it('returns false for unknown or null URL', () => {
      expect(canPlay(null)).toBe(false);
      expect(canPlay('')).toBe(false);
      expect(canPlay('https://example.com/page')).toBe(false);
    });

    it('returns true for blob URLs', () => {
      expect(canPlay('blob:https://example.com/abc')).toBe(true);
    });
  });
});
