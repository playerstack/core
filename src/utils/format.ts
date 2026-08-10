/**
 * Format seconds into a time string (HH:MM:SS or MM:SS).
 */
export function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Index an array by a key property, returning a lookup object.
 */
export function indexBy<T extends Record<string, unknown>>(array: T[], key: string): Record<string, T> {
  return array.reduce<Record<string, T>>((acc, item) => {
    const k = String(item[key]);
    acc[k] = item;
    return acc;
  }, {});
}

/**
 * Omit specified keys from an object.
 */
export function omit<T extends Record<string, unknown>>(object: T, keys: string[]): Partial<T> {
  const output: Partial<T> = {};
  const objectKeys = Object.keys(object) as Array<keyof T>;
  for (const key of objectKeys) {
    if (keys.indexOf(key as string) === -1) {
      output[key] = object[key];
    }
  }
  return output;
}
