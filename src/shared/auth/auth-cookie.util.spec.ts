import { clearAuthCookie, getAuthTokenFromCookieHeader, setAuthCookie } from './auth-cookie.util';

describe('auth-cookie util', () => {
  it('extracts auth token from cookie header', () => {
    expect(getAuthTokenFromCookieHeader('foo=1; grillrent_session=abc123; bar=2')).toBe('abc123');
  });

  it('returns null when auth cookie is missing', () => {
    expect(getAuthTokenFromCookieHeader('foo=1; bar=2')).toBeNull();
  });

  it('sets and clears auth cookie with secure defaults', () => {
    const res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    setAuthCookie(res as any, 'jwt-token', Math.floor(Date.now() / 1000) + 3600);
    clearAuthCookie(res as any);

    expect(res.cookie).toHaveBeenCalledWith(
      'grillrent_session',
      'jwt-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );

    expect(res.clearCookie).toHaveBeenCalledWith(
      'grillrent_session',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });
});
