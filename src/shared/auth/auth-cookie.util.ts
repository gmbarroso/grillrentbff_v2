import { Response } from 'express';

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'grillrent_session';
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'grillrent_csrf';
const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

const isSecureCookieEnv = () => {
  const env = (process.env.NODE_ENV || '').toLowerCase();
  return !['local', 'development', 'dev', 'test'].includes(env);
};

const getCookieSameSite = (): 'lax' | 'none' => {
  const rawValue = (process.env.AUTH_COOKIE_SAMESITE || '').trim().toLowerCase();
  if (rawValue === 'none') return 'none';
  return 'lax';
};

const resolveSecureCookie = (sameSite: 'lax' | 'none'): boolean => {
  const rawValue = (process.env.AUTH_COOKIE_SECURE || '').trim().toLowerCase();
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return sameSite === 'none';
  return sameSite === 'none' || isSecureCookieEnv();
};

const getCookieCommonOptions = (sameSite: 'lax' | 'none') => {
  const secure = resolveSecureCookie(sameSite);
  return {
    secure,
    sameSite,
    path: '/',
    ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
  };
};

const parseCookieHeader = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((acc, cookiePart) => {
    const [rawKey, ...rest] = cookiePart.trim().split('=');
    if (!rawKey || rest.length === 0) return acc;
    const rawValue = rest.join('=');
    try {
      acc[rawKey] = decodeURIComponent(rawValue);
    } catch {
      acc[rawKey] = rawValue;
    }
    return acc;
  }, {} as Record<string, string>);
};

export const getAuthCookieName = (): string => AUTH_COOKIE_NAME;
export const getCsrfCookieName = (): string => CSRF_COOKIE_NAME;

export const getAuthTokenFromCookieHeader = (cookieHeader?: string): string | null => {
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[AUTH_COOKIE_NAME] || null;
};

export const getCsrfTokenFromCookieHeader = (cookieHeader?: string): string | null => {
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[CSRF_COOKIE_NAME] || null;
};

export const setAuthCookie = (res: Response, token: string, exp?: number): void => {
  const sameSite = getCookieSameSite();
  const maxAge = typeof exp === 'number' ? Math.max(0, exp * 1000 - Date.now()) : 60 * 60 * 1000;
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    ...getCookieCommonOptions(sameSite),
    maxAge,
  });
};

export const clearAuthCookie = (res: Response): void => {
  const sameSite = getCookieSameSite();
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    ...getCookieCommonOptions(sameSite),
  });
};

export const setCsrfCookie = (res: Response, csrfToken: string): void => {
  const sameSite = getCookieSameSite();
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    ...getCookieCommonOptions(sameSite),
    maxAge: 60 * 60 * 1000,
  });
};

export const clearCsrfCookie = (res: Response): void => {
  const sameSite = getCookieSameSite();
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    ...getCookieCommonOptions(sameSite),
  });
};
