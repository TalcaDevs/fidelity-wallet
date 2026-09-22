import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class InviteStaffDto {
  @ApiProperty({
    description: 'ID of the merchant to which the staff member will belong (UUID)',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsUUID('4', { message: 'merchantId must be a valid UUID v4' })
  @IsNotEmpty()
  merchantId: string;

  @ApiProperty({
    description: 'Email address of the staff member',
    example: 'mesero@cafeteria.cl',
  })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Optional initial password. If omitted, Supabase sends an invitation email.',
    example: 'ClaveSegura2026!',
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'password must have at least 6 characters' })
  password?: string;
}

export class StaffResponseDto {
  @ApiProperty({ description: 'ID of the created/invited user in Supabase Auth' })
  id: string;

  @ApiProperty({ description: 'Email address of the staff member' })
  email: string;

  @ApiProperty({ description: 'Merchant ID' })
  merchantId: string;

  @ApiProperty({ description: 'Assigned role', example: 'STAFF' })
  role: string;

  @ApiProperty({ description: 'Informational message' })
  message: string;
}
