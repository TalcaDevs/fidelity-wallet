import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto, CustomerResponseDto } from './dto/create-customer.dto.js';

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
}
