import { describe, it, expect } from 'vitest';
import { ROUTES, buildLoginUrl, isReturnableRoute, resolveRedirectTarget, passwordResetUrl } from './routePaths';

describe('resolveRedirectTarget', () => {
  it('keeps an internal path', () => {
    expect(resolveRedirectTarget('/admin/customers?page=2')).toBe('/admin/customers?page=2');
  });

  it('falls back when there is no candidate', () => {
    expect(resolveRedirectTarget(null)).toBe(ROUTES.dashboard);
    expect(resolveRedirectTarget(undefined)).toBe(ROUTES.dashboard);
    expect(resolveRedirectTarget('')).toBe(ROUTES.dashboard);
  });

  it('rejects absolute and protocol-relative urls', () => {
    expect(resolveRedirectTarget('https://evil.com')).toBe(ROUTES.dashboard);
    expect(resolveRedirectTarget('//evil.com')).toBe(ROUTES.dashboard);
    expect(resolveRedirectTarget('/\\evil.com')).toBe(ROUTES.dashboard);
  });

  it('accepts an explicit fallback', () => {
    expect(resolveRedirectTarget('//evil.com', ROUTES.scan)).toBe(ROUTES.scan);
  });
});

describe('isReturnableRoute', () => {
  it('returns true for administrative and internal routes', () => {
    expect(isReturnableRoute('/admin/dashboard')).toBe(true);
    expect(isReturnableRoute('/internal/tickets')).toBe(true);
  });

  it('returns false for /scan and /admin/login', () => {
    expect(isReturnableRoute(ROUTES.scan)).toBe(false);
    expect(isReturnableRoute(ROUTES.login)).toBe(false);
  });
});

describe('buildLoginUrl', () => {
  it('carries the destination in the query string', () => {
    expect(buildLoginUrl('/admin/settings')).toBe('/admin/login?redirect=%2Fadmin%2Fsettings');
  });

  it('does not point the login back at itself', () => {
    expect(buildLoginUrl(ROUTES.login)).toBe(ROUTES.login);
  });

  it('does not append redirect query parameter when coming from scan', () => {
    expect(buildLoginUrl(ROUTES.scan)).toBe(ROUTES.login);
  });
});

describe('passwordResetUrl', () => {
  it('is an absolute url to the reset screen', () => {
    expect(passwordResetUrl()).toBe(`${window.location.origin}/admin/reset`);
  });
});
