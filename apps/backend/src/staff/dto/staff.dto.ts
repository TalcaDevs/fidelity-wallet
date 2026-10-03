import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  STAFF_PASSWORD_MIN,
  type InviteStaffInput,
  type MemberRole,
  type ReassignStaffInput,
  type StaffActivityDto,
  type StaffMemberDto,
  type StaffScanMethod,
  type StaffScanType,
  type StaffStatus,
} from '@fidelity/shared';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class InviteStaffMemberDto implements InviteStaffInput {
  @ApiProperty({
    description: 'Correo electrónico del miembro del personal',
    example: 'mesero@cafeteria.cl',
  })
  @IsEmail({}, { message: 'El correo electrónico debe ser una dirección válida' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @ApiProperty({
    description: 'Local de la marca al que se asigna el mesero',
    example: 'b0000000-0000-0000-0000-000000000002',
  })
  @IsUUID('all', { message: 'Selecciona un local válido' })
  locationId: string;

  @ApiPropertyOptional({
    description:
      'Contraseña inicial opcional. Si se omite, Supabase envía un correo de invitación.',
    example: 'ClaveSegura2026!',
  })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(STAFF_PASSWORD_MIN, {
    message: `La contraseña debe tener al menos ${STAFF_PASSWORD_MIN} caracteres`,
  })
  password?: string;
}

export class ReassignStaffDto implements ReassignStaffInput {
  @ApiProperty({ description: 'Local de la marca al que se mueve el mesero' })
  @IsUUID('all', { message: 'Selecciona un local válido' })
  locationId: string;
}

export class StaffResponseDto {
  @ApiProperty({ description: 'ID del usuario creado/invitado en Supabase Auth' })
  id: string;

  @ApiProperty({ description: 'Correo electrónico del miembro del personal' })
  email: string;

  @ApiProperty({ description: 'Local al que quedó asignado' })
  merchantId: string;

  @ApiProperty({ description: 'Rol asignado', example: 'STAFF' })
  role: string;

  @ApiProperty({ description: 'Mensaje descriptivo del resultado' })
  message: string;
}

export class StaffMemberResponseDto implements StaffMemberDto {
  @ApiProperty() userId: string;
  @ApiProperty({ type: String, nullable: true }) email: string | null;
  @ApiProperty({ enum: ['OWNER', 'STAFF'] }) role: MemberRole;
  @ApiProperty({ type: String, nullable: true, description: 'null para el OWNER' })
  locationId: string | null;
  @ApiProperty({ type: String, nullable: true }) locationName: string | null;
  @ApiProperty({ enum: ['INVITED', 'ACTIVE'] }) status: StaffStatus;
  @ApiProperty({ description: 'STAFF que todavía no confirma su correo' })
  canResendInvite: boolean;
  @ApiProperty() invitedAt: string;
  @ApiProperty({ type: String, nullable: true }) lastSignInAt: string | null;
}

export class StaffActivityResponseDto implements StaffActivityDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['STAMP_ADDED', 'REWARD_REDEEMED'] }) type: StaffScanType;
  @ApiProperty({ enum: ['QR', 'MANUAL', 'PANEL'] }) method: StaffScanMethod;
  @ApiProperty() createdAt: string;
  @ApiProperty() locationName: string;
  @ApiProperty({ type: String, nullable: true, example: '+56 9 **** 5678' })
  customerPhone: string | null;
  @ApiProperty({ type: String, nullable: true }) promotionName: string | null;
}
