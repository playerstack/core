import { formatTime, indexBy, omit } from '../../src/utils/format';

describe('formatTime', () => {
  it('formats seconds under an hour as MM:SS', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(599)).toBe('09:59');
  });

  it('formats seconds over an hour as HH:MM:SS', () => {
    expect(formatTime(3600)).toBe('01:00:00');
    expect(formatTime(3661)).toBe('01:01:01');
    expect(formatTime(36000)).toBe('10:00:00');
  });

  it('handles fractional seconds by flooring', () => {
    expect(formatTime(90.7)).toBe('01:30');
  });
});

describe('indexBy', () => {
  it('indexes array by given key', () => {
    const items = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ];
    expect(indexBy(items, 'id')).toEqual({
      a: { id: 'a', value: 1 },
      b: { id: 'b', value: 2 },
    });
  });

  it('returns empty object for empty array', () => {
    expect(indexBy([], 'id')).toEqual({});
  });
});

describe('omit', () => {
  it('removes specified keys from object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('returns full object when no keys match', () => {
    const obj = { a: 1, b: 2 };
    expect(omit(obj, ['x'])).toEqual({ a: 1, b: 2 });
  });
});
