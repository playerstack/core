import { getCookie, setCookie } from './utils/cookie';

/**
 * Quality/speed threshold mapping for adaptive quality selection.
 */
export const VIDEO_QUALITY_THRESHOLDS = [
  { quality: 144, minSpeed: 0.3 },
  { quality: 270, minSpeed: 0.5 },
  { quality: 360, minSpeed: 0.7 },
  { quality: 480, minSpeed: 1.0 },
  { quality: 720, minSpeed: 2.5 },
  { quality: 1080, minSpeed: 5.0 },
  { quality: 2160, minSpeed: 20.0 },
] as const;

/**
 * Measure network speed by downloading a test file.
 * Caches result in a cookie for 7 days to avoid repeated measurements.
 *
 * @returns Speed in Mbps, or null on failure.
 */
export async function measureNetworkSpeed(): Promise<number | null> {
  const testUrl = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
  const fileSizeInBits = 200 * 1024 * 8;

  try {
    const cached = getCookie('internet_speed');
    if (cached) {
      const parsed = parseFloat(cached);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const startTime = performance.now();
    const response = await fetch(testUrl, {
      signal: controller.signal,
      cache: 'no-store',
    });
    const blob = await response.blob();
    clearTimeout(timeoutId);
    const endTime = performance.now();

    const actualSizeInBits = blob.size * 8 || fileSizeInBits;
    const durationInSeconds = (endTime - startTime) / 1000;
    const speedInMbps = actualSizeInBits / (durationInSeconds * 1024 * 1024);
    setCookie('internet_speed', speedInMbps.toString(), 7);

    return speedInMbps;
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error('An error occurred while measuring the network speed: ', error);
    }
    return null;
  }
}

/**
 * Select the best video quality based on measured network speed.
 *
 * @param speed - Measured speed in Mbps
 * @param availableResolutions - Array of available resolution numbers (e.g. [480, 720, 1080])
 * @returns Recommended resolution, or undefined if no match
 */
export function getRecommendedVideoQuality(speed: number, availableResolutions: number[]): number | undefined {
  let selectedQuality: number | undefined;

  for (let i = VIDEO_QUALITY_THRESHOLDS.length - 1; i >= 0; i--) {
    const option = VIDEO_QUALITY_THRESHOLDS[i]!;
    if (speed >= option.minSpeed) {
      selectedQuality = option.quality;
      break;
    }
  }

  if (selectedQuality && availableResolutions.includes(selectedQuality)) {
    return selectedQuality;
  }

  // Fallback: nearest available quality at or below recommended
  if (selectedQuality) {
    for (let i = VIDEO_QUALITY_THRESHOLDS.length - 1; i >= 0; i--) {
      const option = VIDEO_QUALITY_THRESHOLDS[i]!;
      if (option.quality <= selectedQuality && availableResolutions.includes(option.quality)) {
        return option.quality;
      }
    }
  }

  // Last resort: lowest available
  for (let i = 0; i < VIDEO_QUALITY_THRESHOLDS.length; i++) {
    const option = VIDEO_QUALITY_THRESHOLDS[i]!;
    if (availableResolutions.includes(option.quality)) {
      return option.quality;
    }
  }

  return availableResolutions.length > 0 ? availableResolutions[0] : undefined;
}
