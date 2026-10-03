import { RECEIPT_MAX_BYTES, type CustomerHistoryDto, type PanelStampsResultDto } from '@fidelity/shared';
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import type { UploadedImage } from '../common/storage/image.js';
import { ScanService } from '../scan/scan.service.js';
import { CustomerHistoryService } from './customer-history.service.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto, CustomerResponseDto } from './dto/create-customer.dto.js';
import { DeleteCustomerResponseDto } from './dto/deletion.dto.js';
import { CustomerHistoryQueryDto } from './dto/history.dto.js';
import { PanelStampsDto } from './dto/panel-stamps.dto.js';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly historyService: CustomerHistoryService,
    private readonly scanService: ScanService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Alta o consulta de cliente para emisión de pase',
    description:
      'Registra o busca un cliente final por RUT o Teléfono y emite su pase de fidelidad en el comercio especificado. Es idempotente.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cliente procesado y pase emitido exitosamente',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'RUT inválido o faltan datos requeridos',
  })
  @ApiResponse({
    status: 404,
    description: 'Comercio no encontrado',
  })
  async createCustomer(@Body() dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    return this.customersService.createOrFindCustomer(dto);
  }

  @Get(':customerId/history')
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({
    summary: 'Historial de compras del cliente en la marca (solo el dueño)',
    description:
      'Datos del cliente, totales y cada sello validado (monto, nota y foto de la boleta con URL firmada de 5 minutos) o canje, del más reciente al más antiguo.',
  })
  @ApiResponse({ status: 200, description: 'Historial paginado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño de la marca puede ver el historial' })
  @ApiResponse({ status: 404, description: 'El cliente no tiene tarjeta en esta marca' })
  async getHistory(
    @Param('customerId', new ParseUUIDPipe({ version: '4' })) customerId: string,
    @Query() query: CustomerHistoryQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CustomerHistoryDto> {
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.historyService.forOwner(customerId, query, user.id);
  }

  @Post(':customerId/stamps')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard)
  @UseInterceptors(
    FileInterceptor('receipt', { limits: { fileSize: RECEIPT_MAX_BYTES, files: 1 } }),
  )
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiExtraModels(PanelStampsDto)
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(PanelStampsDto) },
        {
          properties: {
            receipt: {
              type: 'string',
              format: 'binary',
              description: 'En multipart: foto de la boleta (PNG o JPG, hasta 10 MB)',
            },
          },
        },
      ],
    },
  })
  @ApiOperation({
    summary: 'Sumar sellos desde la ficha del cliente (solo el dueño)',
    description:
      'Sin escanear en caja: motivo obligatorio (queda en AuditLog), hasta OWNER_MAX_STAMPS_PER_LOAD sellos, sin bloqueo entre sellos. Queda en el historial con método PANEL y actualiza la tarjeta de la billetera.',
  })
  @ApiResponse({ status: 201, description: 'Sellos sumados' })
  @ApiResponse({ status: 400, description: 'Sin motivo, sobre el tope o foto inválida' })
  @ApiResponse({ status: 403, description: 'Solo el dueño, y solo en un local activo de su marca' })
  @ApiResponse({ status: 404, description: 'El cliente no tiene tarjeta en esta marca' })
  async addStamps(
    @Param('customerId', new ParseUUIDPipe({ version: '4' })) customerId: string,
    @Body() dto: PanelStampsDto,
    @UploadedFile() receipt?: UploadedImage,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PanelStampsResultDto> {
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.scanService.addStampsFromPanel(customerId, dto, user.id, receipt);
  }

  @Delete(':customerId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({
    summary: 'Eliminar datos y pase de un cliente en un comercio (Ley 19.628)',
    description:
      'Permite al dueño del comercio (OWNER) eliminar de forma permanente el pase, sellos e historial de un cliente en su comercio en cumplimiento del derecho de cancelación (Ley 19.628). Si el cliente no posee pases en otros comercios, sus datos personales son eliminados por completo.',
  })
  @ApiQuery({
    name: 'merchantId',
    required: true,
    description:
      'ID del comercio. Verifica que el usuario autenticado sea OWNER del comercio y elimina al cliente en dicho comercio.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pase y datos del cliente eliminados exitosamente',
    type: DeleteCustomerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de comercio o cliente no es un UUID válido',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado / falta token de sesión',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el dueño del comercio puede eliminar clientes',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente o comercio no encontrado',
  })
  async deleteCustomer(
    @Param('customerId', new ParseUUIDPipe({ version: '4' })) customerId: string,
    @Query('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<DeleteCustomerResponseDto> {
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    return this.customersService.deleteCustomerByMerchant(merchantId, customerId, user.id);
  }
}
