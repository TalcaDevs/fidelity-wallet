import {
  applyDecorators,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  type Type,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  TICKET_ATTACHMENT_MAX_BYTES,
  type Paginated,
  type TicketDetailDto,
  type TicketSummaryDto,
} from '@fidelity/shared';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import type { UploadedImage } from './attachments.js';
import {
  CreateTicketDto,
  ListTicketsQueryDto,
  ReplyTicketDto,
} from './dto/support.dto.js';
import { SupportService } from './support.service.js';

export const attachmentInterceptor = FileInterceptor('attachment', {
  limits: { fileSize: TICKET_ATTACHMENT_MAX_BYTES, files: 1 },
});

/** multipart/form-data con los campos del DTO más la captura opcional `attachment`. */
export const ApiMultipartWithAttachment = (dto: Type<unknown>) =>
  applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiExtraModels(dto),
    ApiBody({
      schema: {
        allOf: [
          { $ref: getSchemaPath(dto) },
          {
            properties: {
              attachment: {
                type: 'string',
                format: 'binary',
                description: 'PNG o JPG, hasta 10 MB',
              },
            },
          },
        ],
      },
    }),
  );

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('brands/:brandId/support/tickets')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(attachmentInterceptor)
  @ApiMultipartWithAttachment(CreateTicketDto)
  @ApiOperation({ summary: 'Crear un ticket de soporte (solo OWNER)' })
  @ApiResponse({
    status: 201,
    description: 'TicketDetailDto (packages/shared)',
  })
  @ApiResponse({
    status: 400,
    description: 'Validación, captura inválida o local ajeno',
  })
  @ApiResponse({ status: 403, description: 'No es OWNER de la marca' })
  @ApiResponse({ status: 413, description: 'Captura de más de 10 MB' })
  @ApiResponse({
    status: 429,
    description: 'Más de 10 tickets en la última hora',
  })
  create(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedImage,
  ): Promise<TicketDetailDto> {
    return this.support.create(brandId, user.id, dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Listar los tickets de la marca' })
  @ApiResponse({ status: 200, description: 'Paginated<TicketSummaryDto>' })
  list(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Query() query: ListTicketsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Paginated<TicketSummaryDto>> {
    return this.support.list(brandId, user.id, query);
  }

  @Get(':ticketId')
  @ApiOperation({
    summary: 'Detalle con el hilo (sin notas internas); lo marca como leído',
  })
  @ApiResponse({ status: 200, description: 'TicketDetailDto' })
  @ApiResponse({
    status: 404,
    description: 'Ticket inexistente o de otra marca',
  })
  get(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketDetailDto> {
    return this.support.get(brandId, user.id, ticketId);
  }

  @Post(':ticketId/messages')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(attachmentInterceptor)
  @ApiMultipartWithAttachment(ReplyTicketDto)
  @ApiOperation({
    summary: 'Responder un ticket. Si estaba RESOLVED, se reabre',
  })
  @ApiResponse({ status: 201, description: 'TicketDetailDto' })
  @ApiResponse({ status: 409, description: 'Ticket cerrado' })
  reply(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: ReplyTicketDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedImage,
  ): Promise<TicketDetailDto> {
    return this.support.reply(brandId, user.id, ticketId, dto, file);
  }
}
