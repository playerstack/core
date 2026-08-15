import { getRecommendedVideoQuality, measureNetworkSpeed, VIDEO_QUALITY_THRESHOLDS } from '../src/quality';

// Mock fetch and performance for measureNetworkSpeed
const mockFetch = jest.fn();
const mockPerformanceNow = jest.fn();
(global as any).fetch = mockFetch;
(global as any).performance = { now: mockPerformanceNow };

// Mock cookie functions used by measureNetworkSpeed
jest.mock('../src/utils/cookie', () => ({
  getCookie: jest.fn(() => null),
  setCookie: jest.fn(),
}));

import { getCookie, setCookie } from '../src/utils/cookie';
const mockedGetCookie = getCookie as jest.Mock;
const mockedSetCookie = setCookie as jest.Mock;

describe('VIDEO_QUALITY_THRESHOLDS', () => {
  test('is sorted by quality ascending', () => {
    for (let i = 1; i < VIDEO_QUALITY_THRESHOLDS.length; i++) {
      expect(VIDEO_QUALITY_THRESHOLDS[i]!.quality).toBeGreaterThan(VIDEO_QUALITY_THRESHOLDS[i - 1]!.quality);
    }
  });

  test('is sorted by minSpeed ascending', () => {
    for (let i = 1; i < VIDEO_QUALITY_THRESHOLDS.length; i++) {
      expect(VIDEO_QUALITY_THRESHOLDS[i]!.minSpeed).toBeGreaterThan(VIDEO_QUALITY_THRESHOLDS[i - 1]!.minSpeed);
    }
  });
});

describe('getRecommendedVideoQuality', () => {
  test('returns 1080 for 5 Mbps when available', () => {
    expect(getRecommendedVideoQuality(5, [480, 720, 1080])).toBe(1080);
  });

  test('returns 720 for 2.5 Mbps when available', () => {
    expect(getRecommendedVideoQuality(2.5, [480, 720, 1080])).toBe(720);
  });

  test('returns 480 for 1.0 Mbps', () => {
    expect(getRecommendedVideoQuality(1.0, [360, 480, 720])).toBe(480);
  });

  test('falls back to nearest lower quality when exact not available', () => {
    // 5 Mbps recommends 1080, but only 720 available
    expect(getRecommendedVideoQuality(5, [360, 720])).toBe(720);
  });

  test('returns lowest available when speed is very low', () => {
    // Below all thresholds, last resort picks lowest available from threshold list
    expect(getRecommendedVideoQuality(0.1, [360, 720, 1080])).toBe(360);
  });

  test('returns undefined for empty sources', () => {
    expect(getRecommendedVideoQuality(10, [])).toBeUndefined();
  });

  test('returns 2160 for very high speed', () => {
    expect(getRecommendedVideoQuality(25, [720, 1080, 2160])).toBe(2160);
  });

  test('returns first source when no threshold matches available resolutions', () => {
    expect(getRecommendedVideoQuality(0.5, [144, 270])).toBe(270);
  });
});


describe('measureNetworkSpeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCookie.mockReturnValue(null);
  });

  test('returns cached speed from cookie', async () => {
    mockedGetCookie.mockReturnValue('5.5');
    const speed = await measureNetworkSpeed();
    expect(speed).toBe(5.5);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('measures speed via fetch and caches result', async () => {
    mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(1000); // 1 second
    const mockBlob = { size: 200 * 1024 }; // 200KB
    mockFetch.mockResolvedValue({ blob: () => Promise.resolve(mockBlob) });

    const speed = await measureNetworkSpeed();
    expect(speed).toBeGreaterThan(0);
    expect(mockedSetCookie).toHaveBeenCalledWith('internet_speed', expect.any(String), 7);
  });

  test('returns null on fetch error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValue(new Error('Network error'));

    const speed = await measureNetworkSpeed();
    expect(speed).toBeNull();
    consoleSpy.mockRestore();
  });

  test('returns null on abort (no console.error)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    const speed = await measureNetworkSpeed();
    expect(speed).toBeNull();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('ignores invalid cookie values', async () => {
    mockedGetCookie.mockReturnValue('invalid');
    mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(500);
    mockFetch.mockResolvedValue({ blob: () => Promise.resolve({ size: 100 * 1024 }) });

    const speed = await measureNetworkSpeed();
    expect(speed).toBeGreaterThan(0);
  });

  test('ignores zero cookie value', async () => {
    mockedGetCookie.mockReturnValue('0');
    mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(500);
    mockFetch.mockResolvedValue({ blob: () => Promise.resolve({ size: 100 * 1024 }) });

    const speed = await measureNetworkSpeed();
    expect(speed).toBeGreaterThan(0);
  });
});
