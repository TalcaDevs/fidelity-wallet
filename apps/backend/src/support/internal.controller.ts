import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { InternalTicketDto, Paginated } from '@fidelity/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  PlatformAdminGuard,
  PlatformRoles,
  type PlatformAdminUser,
} from '../common/guards/platform-admin.guard.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import type { UploadedImage } from './attachments.js';
import {
  InternalReplyTicketDto,
  ListInternalTicketsQueryDto,
  UpdateTicketDto,
} from './dto/support.dto.js';
import { InternalTicketsService } from './internal-tickets.service.js';
import {
  ApiMultipartWithAttachment,
  attachmentInterceptor,
} from './support.controller.js';

@ApiTags('Internal')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, PlatformAdminGuard)
@PlatformRoles('SUPERADMIN', 'SUPPORT')
@ApiResponse({ status: 403, description: 'El usuario no es PlatformAdmin' })
@Controller('internal')
export class InternalController {
  constructor(private readonly tickets: InternalTicketsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Rol del admin interno de la sesión' })
  me(@CurrentUser() user: PlatformAdminUser) {
    return {
      userId: user.id,
      email: user.email ?? null,
      role: user.platformRole,
    };
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Bandeja de tickets de todas las marcas' })
  @ApiResponse({ status: 200, description: 'Paginated<InternalTicketDto>' })
  listTickets(
    @Query() query: ListInternalTicketsQueryDto,
  ): Promise<Paginated<InternalTicketDto>> {
    return this.tickets.list(query);
  }

  @Get('tickets/:ticketId')
  @ApiOperation({ summary: 'Detalle con notas internas' })
  getTicket(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
  ): Promise<InternalTicketDto> {
    return this.tickets.get(ticketId);
  }

  @Patch('tickets/:ticketId')
  @ApiOperation({
    summary: 'Cambiar estado, prioridad o asignación (queda en AuditLog)',
  })
  @ApiResponse({
    status: 409,
    description: 'Transición de estado no permitida',
  })
  updateTicket(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: PlatformAdminUser,
  ): Promise<InternalTicketDto> {
    return this.tickets.update(ticketId, user.id, dto);
  }

  @Post('tickets/:ticketId/messages')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(attachmentInterceptor)
  @ApiMultipartWithAttachment(InternalReplyTicketDto)
  @ApiOperation({ summary: 'Responder o dejar una nota interna' })
  @ApiResponse({
    status: 409,
    description: 'Ticket cerrado o transición no permitida',
  })
  replyTicket(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: InternalReplyTicketDto,
    @CurrentUser() user: PlatformAdminUser,
    @UploadedFile() file?: UploadedImage,
  ): Promise<InternalTicketDto> {
    return this.tickets.reply(ticketId, user.id, dto, file);
  }
}
