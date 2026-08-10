import { getCookie, setCookie, deleteCookie } from '../../src/utils/cookie';

describe('cookie utils', () => {
  beforeEach(() => {
    // Clear all cookies
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0]!.trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    });
  });

  it('setCookie and getCookie work together', () => {
    setCookie('test', 'hello');
    expect(getCookie('test')).toBe('hello');
  });

  it('getCookie returns null for nonexistent cookie', () => {
    expect(getCookie('nonexistent')).toBeNull();
  });

  it('deleteCookie removes the cookie', () => {
    setCookie('temp', 'value');
    deleteCookie('temp');
    expect(getCookie('temp')).toBeNull();
  });

  it('handles special characters in cookie values', () => {
    setCookie('special', 'hello=world&foo');
    expect(getCookie('special')).toBe('hello=world&foo');
  });
});
