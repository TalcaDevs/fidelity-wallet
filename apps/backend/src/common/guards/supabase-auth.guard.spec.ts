import { ExecutionContext, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let configService: ConfigService;
  let mockSupabaseClient: Partial<SupabaseClient>;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'owner@local.cl',
    user_metadata: { role: 'OWNER' },
  };

  const createMockContext = (authHeader?: string): { context: ExecutionContext; request: any } => {
    const request: any = {
      headers: authHeader ? { authorization: authHeader } : {},
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  beforeEach(() => {
    configService = {
      get: vi.fn((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-key';
        return null;
      }),
    } as unknown as ConfigService;

    guard = new SupabaseAuthGuard(configService);

    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      } as any,
    };
  });

  describe('Missing or Malformed Headers', () => {
    it('throws UnauthorizedException when Authorization header is missing', async () => {
      const { context } = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Missing or malformed Authorization header'),
      );
    });

    it('throws UnauthorizedException when Authorization header does not use Bearer scheme', async () => {
      const { context } = createMockContext('Basic dXNlcjpwYXNz');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Missing or malformed Authorization header'),
      );
    });

    it('throws UnauthorizedException when Bearer token is empty', async () => {
      const { context } = createMockContext('Bearer ');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Empty bearer token provided'),
      );
    });

    it('throws UnauthorizedException when Bearer token is only whitespace', async () => {
      const { context } = createMockContext('Bearer    ');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Empty bearer token provided'),
      );
    });
  });

  describe('Token Validation with Supabase', () => {
    it('throws UnauthorizedException when Supabase returns an error for the token', async () => {
      guard.setSupabaseClient(mockSupabaseClient as SupabaseClient);
      (mockSupabaseClient.auth!.getUser as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      const { context } = createMockContext('Bearer expired-token');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('JWT expired'),
      );
    });

    it('throws UnauthorizedException when Supabase returns no user and no explicit error', async () => {
      guard.setSupabaseClient(mockSupabaseClient as SupabaseClient);
      (mockSupabaseClient.auth!.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { context } = createMockContext('Bearer invalid-token');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired authentication token'),
      );
    });

    it('authenticates successfully, sets request.user, and returns true when token is valid', async () => {
      guard.setSupabaseClient(mockSupabaseClient as SupabaseClient);
      (mockSupabaseClient.auth!.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { context, request } = createMockContext('Bearer valid-jwt-token');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSupabaseClient.auth!.getUser).toHaveBeenCalledWith('valid-jwt-token');
      expect(request.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        user_metadata: mockUser.user_metadata,
      });
    });
  });

  describe('Configuration Handling', () => {
    it('throws InternalServerErrorException if Supabase credentials are missing', async () => {
      const emptyConfig = { get: vi.fn().mockReturnValue(null) } as unknown as ConfigService;
      const unconfiguredGuard = new SupabaseAuthGuard(emptyConfig);

      // Limpiamos process.env temporalmente si existen
      const originalUrl = process.env.SUPABASE_URL;
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      try {
        const { context } = createMockContext('Bearer any-token');

        await expect(unconfiguredGuard.canActivate(context)).rejects.toThrow(
          InternalServerErrorException,
        );
      } finally {
        if (originalUrl) process.env.SUPABASE_URL = originalUrl;
        if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
      }
    });
  });
});
