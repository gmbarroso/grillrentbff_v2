import { Response } from 'express';

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'grillrent_session';

const isSecureCookieEnv = () => {
  const env = (process.env.NODE_ENV || '').toLowerCase();
  return !['local', 'development', 'dev', 'test'].includes(env);
};

const parseCookieHeader = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((acc, cookiePart) => {
    const [rawKey, ...rest] = cookiePart.trim().split('=');
    if (!rawKey || rest.length === 0) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {} as Record<string, string>);
};

export const getAuthCookieName = (): string => AUTH_COOKIE_NAME;

export const getAuthTokenFromCookieHeader = (cookieHeader?: string): string | null => {
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[AUTH_COOKIE_NAME] || null;
};

export const setAuthCookie = (res: Response, token: string, exp?: number): void => {
  const maxAge = typeof exp === 'number' ? Math.max(0, exp * 1000 - Date.now()) : 60 * 60 * 1000;
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureCookieEnv(),
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecureCookieEnv(),
    sameSite: 'lax',
    path: '/',
  });
};
