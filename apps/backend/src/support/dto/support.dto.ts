import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TICKET_CATEGORIES,
  TICKET_DESCRIPTION_MIN,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TEXT_MAX,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@fidelity/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const E164 = /^\+[1-9]\d{7,14}$/;
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateTicketDto {
  @ApiProperty({ enum: TICKET_CATEGORIES })
  @IsIn(TICKET_CATEGORIES, { message: 'Selecciona una categoría válida' })
  category: TicketCategory;

  @ApiProperty({
    minLength: TICKET_DESCRIPTION_MIN,
    maxLength: TICKET_TEXT_MAX,
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(TICKET_DESCRIPTION_MIN, TICKET_TEXT_MAX, {
    message: `Describe el problema en ${TICKET_DESCRIPTION_MIN} a ${TICKET_TEXT_MAX} caracteres`,
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Local de la marca sobre el que se consulta',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID('4', { message: 'El local indicado no es válido' })
  locationId?: string;

  @ApiPropertyOptional({
    example: '+56912345678',
    description: 'Formato E.164',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(E164, {
    message:
      'El teléfono debe tener formato internacional, por ejemplo +56912345678',
  })
  contactPhone?: string;
}

export class ReplyTicketDto {
  @ApiProperty({ minLength: 1, maxLength: TICKET_TEXT_MAX })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, TICKET_TEXT_MAX, {
    message: `El mensaje debe tener entre 1 y ${TICKET_TEXT_MAX} caracteres`,
  })
  body: string;
}

export class InternalReplyTicketDto extends ReplyTicketDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Nota interna: el dueño no la ve',
  })
  @Transform(
    ({ value }: { value: unknown }) => value === true || value === 'true',
  )
  @IsBoolean()
  isInternal: boolean = false;

  @ApiPropertyOptional({
    enum: TICKET_STATUSES,
    description:
      'Estado tras responder. Por defecto una respuesta pública deja el ticket en WAITING_ON_MERCHANT',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TICKET_STATUSES })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;

  @ApiPropertyOptional({
    nullable: true,
    description: 'userId de un PlatformAdmin, o null para desasignar',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID('4')
  assigneeId?: string | null;
}

export class PageQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}

export class ListTicketsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: TICKET_STATUSES })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;
}

export class ListInternalTicketsQueryDto extends ListTicketsQueryDto {
  @ApiPropertyOptional({ enum: TICKET_CATEGORIES })
  @IsOptional()
  @IsIn(TICKET_CATEGORIES)
  category?: TicketCategory;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  brandId?: string;

  @ApiPropertyOptional({
    description: 'userId del asignado, o "none" para los sin asignar',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== 'none')
  @IsUUID('4')
  assigneeId?: string;

  @ApiPropertyOptional({
    description:
      'Número de ticket, texto de la descripción o nombre de la marca',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  q?: string;
}
