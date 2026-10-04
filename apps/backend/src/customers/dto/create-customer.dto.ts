import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CUSTOMER_EMAIL_MAX, CUSTOMER_NAME_MAX } from '@fidelity/shared';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const optionalText = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return text === '' ? undefined : text;
};

const CONTACT_REQUIRED = 'Ingresa tu teléfono o tu correo';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'ID único del comercio en formato UUID',
    example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
  })
  @IsUUID('4', { message: 'El merchantId debe ser un UUID v4 válido' })
  merchantId: string;

  @ApiPropertyOptional({
    description: 'RUT chileno del cliente (con o sin puntos/guion). Opcional',
    example: '12.345.678-5',
  })
  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'El RUT debe ser una cadena de texto' })
  rut?: string;

  @ApiPropertyOptional({
    description: 'Teléfono celular chileno. Obligatorio si no se envía email',
    example: '+56912345678',
  })
  @Transform(optionalText)
  @ValidateIf((o: CreateCustomerDto) => !o.email)
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: CONTACT_REQUIRED })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Correo del cliente. Obligatorio si no se envía phone',
    example: 'maria@gmail.com',
  })
  @Transform(optionalText)
  @ValidateIf((o: CreateCustomerDto) => !o.phone)
  @IsString({ message: 'El correo debe ser una cadena de texto' })
  @IsNotEmpty({ message: CONTACT_REQUIRED })
  @MaxLength(CUSTOMER_EMAIL_MAX, { message: 'El correo es demasiado largo' })
  email?: string;

  @ApiPropertyOptional({ description: 'Nombre del cliente. Opcional', example: 'María Pérez' })
  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MaxLength(CUSTOMER_NAME_MAX, {
    message: `El nombre no puede superar los ${CUSTOMER_NAME_MAX} caracteres`,
  })
  name?: string;

  @ApiPropertyOptional({ description: 'Día del cumpleaños (1-31). Va junto con birthMonth', example: 14 })
  @IsOptional()
  @IsInt({ message: 'El día del cumpleaños debe ser un número' })
  @Min(1)
  @Max(31)
  birthDay?: number;

  @ApiPropertyOptional({ description: 'Mes del cumpleaños (1-12). Va junto con birthDay', example: 2 })
  @IsOptional()
  @IsInt({ message: 'El mes del cumpleaños debe ser un número' })
  @Min(1)
  @Max(12)
  birthMonth?: number;

  @ApiPropertyOptional({ description: 'Año de nacimiento. Opcional aunque se dé el cumpleaños', example: 1990 })
  @IsOptional()
  @IsInt({ message: 'El año de nacimiento debe ser un número' })
  birthYear?: number;

  @ApiProperty({
    description: 'El cliente aceptó los términos y condiciones (/terminos). Debe ser true',
    example: true,
  })
  @IsBoolean({ message: 'Debe indicar si acepta los términos y condiciones' })
  @Equals(true, { message: 'Debes aceptar los términos y condiciones para obtener tu tarjeta' })
  acceptedTerms: boolean;
}

export class CustomerResponseDto {
  @ApiProperty({
    description: 'ID del cliente registrado',
    example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
  })
  customerId: string;

  @ApiProperty({
    description: 'ID del pase emitido para este comercio',
    example: 'e4c08495-e224-4122-9f9f-e0117ab81cd7',
  })
  passId: string;

  @ApiProperty({
    description: 'Indica si el cliente o pase es nuevo o ya existía',
    example: true,
  })
  isNew: boolean;

  @ApiPropertyOptional({
    description: 'URL para descargar el pase en Apple Wallet (.pkpass)',
    example: '/api/passes/e4c08495-e224-4122-9f9f-e0117ab81cd7/apple',
  })
  appleWalletUrl?: string;

  @ApiPropertyOptional({
    description: 'URL para guardar el pase en Google Wallet',
    example: 'https://pay.google.com/gp/v/save/...',
  })
  googleWalletUrl?: string;
}
