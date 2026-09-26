import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteCustomerResponseDto {
  @ApiProperty({ example: true, description: 'Indica si la eliminación se completó con éxito' })
  success: boolean;

  @ApiProperty({ example: 'Datos y pase del cliente eliminados exitosamente' })
  message: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el registro Customer fue borrado por completo de la base de datos',
  })
  customerCompletelyDeleted?: boolean;
}
