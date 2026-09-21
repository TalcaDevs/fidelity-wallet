import { describe, it, expect } from 'vitest';
import { ROUTES, buildLoginUrl, resolveRedirectTarget, passwordResetUrl } from './routePaths';

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

describe('buildLoginUrl', () => {
  it('carries the destination in the query string', () => {
    expect(buildLoginUrl('/admin/settings')).toBe('/admin/login?redirect=%2Fadmin%2Fsettings');
  });

  it('does not point the login back at itself', () => {
    expect(buildLoginUrl(ROUTES.login)).toBe(ROUTES.login);
  });
});

describe('passwordResetUrl', () => {
  it('is an absolute url to the reset screen', () => {
    expect(passwordResetUrl()).toBe(`${window.location.origin}/admin/reset`);
  });
});
