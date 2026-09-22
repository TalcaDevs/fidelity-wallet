import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class InviteStaffMemberDto {
  @ApiProperty({
    description: 'Correo electrónico del miembro del personal',
    example: 'mesero@cafeteria.cl',
  })
  @IsEmail({}, { message: 'El correo electrónico debe ser una dirección válida' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @ApiPropertyOptional({
    description: 'Contraseña inicial opcional. Si se omite, Supabase envía un correo de invitación.',
    example: 'ClaveSegura2026!',
  })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;
}

export class InviteStaffDto extends InviteStaffMemberDto {
  @ApiProperty({
    description: 'ID del comercio al que pertenecerá el personal (UUID v4)',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsUUID('4', { message: 'merchantId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'merchantId es requerido' })
  merchantId: string;
}

export class StaffResponseDto {
  @ApiProperty({ description: 'ID del usuario creado/invitado en Supabase Auth' })
  id: string;

  @ApiProperty({ description: 'Correo electrónico del miembro del personal' })
  email: string;

  @ApiProperty({ description: 'ID del comercio asociado' })
  merchantId: string;

  @ApiProperty({ description: 'Rol asignado', example: 'STAFF' })
  role: string;

  @ApiProperty({ description: 'Mensaje descriptivo del resultado' })
  message: string;
}
