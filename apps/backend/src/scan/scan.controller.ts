import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import { SkipThrottle } from '@nestjs/throttler';
import { RECEIPT_MAX_BYTES } from '@fidelity/shared';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import type { UploadedImage } from '../common/storage/image.js';
import {
  ScanActionDto,
  ScanResultDto,
  ScanValidateDto,
  ScanValidationDto,
} from './dto/scan-action.dto.js';
import { ScanService } from './scan.service.js';

@ApiTags('Cashier Scanner (PWA)')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@SkipThrottle()
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validar al cliente en caja sin sumar sellos',
    description:
      'Identifica el pase por QR o ingreso manual (RUT, teléfono o correo) y devuelve el primer nombre del cliente, su saldo, los premios disponibles, el bloqueo entre sellos y un comprobante (validationToken) para sumar el sello o canjear con POST /api/scan.',
  })
  @ApiResponse({ status: 200, type: ScanValidationDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos o el comercio no tiene promoción activa' })
  @ApiResponse({ status: 401, description: 'Usuario no autenticado' })
  @ApiResponse({ status: 403, description: 'El pase no pertenece al comercio o el usuario no es miembro' })
  @ApiResponse({ status: 404, description: 'Pase no encontrado o el cliente no tiene tarjeta en este comercio' })
  @ApiResponse({ status: 429, description: 'Demasiadas búsquedas manuales seguidas del mismo usuario' })
  async validate(
    @Body() dto: ScanValidateDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ScanValidationDto> {
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.scanService.validate(dto, user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('receipt', { limits: { fileSize: RECEIPT_MAX_BYTES, files: 1 } }),
  )
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiExtraModels(ScanActionDto)
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(ScanActionDto) },
        {
          properties: {
            receipt: {
              type: 'string',
              format: 'binary',
              description: 'Solo STAMP, en multipart: foto de la boleta (PNG o JPG, hasta 10 MB)',
            },
          },
        },
      ],
    },
  })
  @ApiOperation({
    summary: 'Procesar escaneo de pase: agregar sello o canjear premio',
    description:
      'Valida el pase de forma transaccional con bloqueo pesimista de fila, bloqueo de 30 minutos entre sellos del mismo pase (QR o manual; el OWNER puede saltarlo dando motivo), anti-doble canje de 90 segundos, consumo FIFO en canje y auditoría del mesero autenticado. En STAMP acepta el monto, una nota y la foto de la boleta, y el OWNER puede cargar varios sellos con motivo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Escaneo procesado exitosamente (o sello ignorado por el bloqueo de 30 min, alreadyScanned=true)',
    type: ScanResultDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos, comprobante vencido, foto inválida, varios sellos sin motivo o sobre el tope, sellos insuficientes, o REDEEM sin promotionId cuando hay varias promociones activas',
  })
  @ApiResponse({ status: 401, description: 'Usuario no autenticado' })
  @ApiResponse({
    status: 403,
    description: 'El pase no pertenece al comercio, el usuario no es miembro, o un STAFF intenta cargar varios sellos',
  })
  @ApiResponse({
    status: 404,
    description: 'Token de pase no encontrado, o el cliente (ingreso manual) no tiene tarjeta en este comercio',
  })
  @ApiResponse({ status: 429, description: 'Demasiadas búsquedas manuales seguidas del mismo usuario' })
  @ApiResponse({ status: 409, description: 'Conflicto de concurrencia al canjear sellos' })
  async scanPass(
    @Body() dto: ScanActionDto,
    @UploadedFile() receipt?: UploadedImage,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ScanResultDto> {
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.scanService.processScan(dto, user.id, receipt);
  }
}
