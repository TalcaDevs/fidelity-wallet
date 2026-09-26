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
import { DeleteCustomerResponseDto } from './dto/deletion.dto.js';

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
}
