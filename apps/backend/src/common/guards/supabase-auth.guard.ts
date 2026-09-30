import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase: SupabaseClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getSupabaseClient(): SupabaseClient {
    if (!this.supabase) {
      const url =
        this.configService.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL;
      const key =
        this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
        process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !key) {
        throw new InternalServerErrorException(
          'Supabase credentials are required to validate authentication tokens',
        );
      }

      this.supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return this.supabase;
  }

  // Method to inject mock client in unit tests
  public setSupabaseClient(client: SupabaseClient): void {
    this.supabase = client;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      throw new UnauthorizedException('Empty bearer token provided');
    }

    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      throw new UnauthorizedException(
        error?.message || 'Invalid or expired authentication token',
      );
    }

    request.user = {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    };

    return true;
  }
}
