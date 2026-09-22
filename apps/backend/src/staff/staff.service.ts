import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InviteStaffDto, StaffResponseDto } from './dto/invite-staff.dto.js';

@Injectable()
export class StaffService {
  private supabaseAdmin: SupabaseClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  public getSupabaseAdmin(): SupabaseClient {
    if (!this.supabaseAdmin) {
      const url = this.configService.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL;
      const serviceRoleKey =
        this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
        process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceRoleKey) {
        throw new InternalServerErrorException(
          'Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are required',
        );
      }

      this.supabaseAdmin = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return this.supabaseAdmin;
  }

  // Allows injecting a custom or mocked client (e.g. for unit testing)
  public setSupabaseAdmin(client: SupabaseClient): void {
    this.supabaseAdmin = client;
  }

  async inviteStaff(dto: InviteStaffDto): Promise<StaffResponseDto> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant with ID ${dto.merchantId} not found`);
    }

    const supabase = this.getSupabaseAdmin();

    if (dto.password) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          merchant_id: dto.merchantId,
          role: 'STAFF',
        },
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      if (!data?.user) {
        throw new BadRequestException('Failed to create staff user');
      }

      return {
        id: data.user.id,
        email: data.user.email ?? dto.email,
        merchantId: dto.merchantId,
        role: 'STAFF',
        message: 'Staff user created successfully with credentials',
      };
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(dto.email, {
      data: {
        merchant_id: dto.merchantId,
        role: 'STAFF',
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data?.user) {
      throw new BadRequestException('Failed to send staff invitation');
    }

    return {
      id: data.user.id,
      email: data.user.email ?? dto.email,
      merchantId: dto.merchantId,
      role: 'STAFF',
      message: 'Staff invitation email sent successfully',
    };
  }
}
