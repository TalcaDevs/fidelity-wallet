import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto, CustomerResponseDto } from './dto/create-customer.dto.js';
import {
  DeleteCustomerResponseDto,
  RequestDeletionDto,
  RequestDeletionResponseDto,
  VerifyDeletionDto,
} from './dto/deletion.dto.js';
import {
  RequestRecoveryDto,
  RequestRecoveryResponseDto,
  VerifyRecoveryDto,
  VerifyRecoveryResponseDto,
} from './dto/recovery.dto.js';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

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

  @Post('recovery/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Solicita un código OTP para recuperar un pase perdido',
    description:
      'Envía un código de verificación de 6 dígitos por SMS al teléfono registrado del cliente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Código de verificación generado y enviado',
    type: RequestRecoveryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o rate-limit excedido',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente o comercio no encontrado',
  })
  async requestRecovery(
    @Body() dto: RequestRecoveryDto,
  ): Promise<RequestRecoveryResponseDto> {
    return this.customersService.requestRecoveryCode(dto);
  }

  @Post('recovery/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verifica el código OTP y devuelve las credenciales del pase',
    description:
      'Verifica el código de 6 dígitos recibido por SMS y devuelve las URLs de Apple y Google Wallet.',
  })
  @ApiResponse({
    status: 200,
    description: 'Código verificado con éxito y credenciales re-emitidas',
    type: VerifyRecoveryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Código incorrecto o expirado',
  })
  @ApiResponse({
    status: 404,
    description: 'Pase o cliente no encontrado',
  })
  async verifyRecovery(
    @Body() dto: VerifyRecoveryDto,
  ): Promise<VerifyRecoveryResponseDto> {
    return this.customersService.verifyRecoveryCode(dto);
  }

  @Delete(':customerId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({
    summary: 'Eliminar datos personales de un cliente (Ley 19.628)',
    description:
      'Permite al dueño del comercio o administrador eliminar de forma permanente el pase, sellos e historial de un cliente en cumplimiento del derecho de cancelación (Ley 19.628). Si el cliente no posee pases en otros comercios, sus datos personales son eliminados por completo.',
  })
  @ApiQuery({
    name: 'merchantId',
    required: false,
    description:
      'ID del comercio. Si se especifica, verifica que el usuario autenticado sea OWNER del comercio y elimina al cliente en dicho comercio.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pase y datos del cliente eliminados exitosamente',
    type: DeleteCustomerResponseDto,
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
    @Query('merchantId') merchantId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<DeleteCustomerResponseDto> {
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    if (merchantId) {
      return this.customersService.deleteCustomerByMerchant(merchantId, customerId, user.id);
    }

    return this.customersService.deleteCustomerGlobal(customerId);
  }

  @Post('deletion/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Solicita un código OTP para confirmar la eliminación de datos (Ley 19.628)',
    description:
      'Envía un código de 6 dígitos por SMS al teléfono registrado del cliente para validar su identidad antes de eliminar sus datos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Código de confirmación de eliminación enviado',
    type: RequestDeletionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o cliente sin teléfono',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente o comercio no encontrado',
  })
  async requestDeletion(
    @Body() dto: RequestDeletionDto,
  ): Promise<RequestDeletionResponseDto> {
    return this.customersService.requestDeletionCode(dto);
  }

  @Post('deletion/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verifica el código OTP y ejecuta la eliminación definitiva de datos (Ley 19.628)',
    description:
      'Valida el código de 6 dígitos enviado por SMS y elimina inmediatamente la tarjeta y datos personales del cliente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos y tarjeta eliminados exitosamente conforme a la ley',
    type: DeleteCustomerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Código incorrecto o expirado',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente o código no encontrado',
  })
  async verifyDeletion(
    @Body() dto: VerifyDeletionDto,
  ): Promise<DeleteCustomerResponseDto> {
    return this.customersService.verifyDeletionCode(dto);
  }
}
