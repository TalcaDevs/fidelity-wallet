import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ScanActionType {
  STAMP = 'STAMP',
  REDEEM = 'REDEEM',
}

export class ScanActionDto {
  @ApiProperty({
    description: 'Cryptographic token from the scanned pass QR code',
    example: 'd9b73489e248bdfb1e8432b0c16922ef65e90d8a43f8e562308cf2b17f564344',
  })
  @IsString()
  @IsNotEmpty()
  passToken: string;

  @ApiProperty({
    description: 'Action to perform: STAMP to add a stamp, REDEEM to claim a reward',
    enum: ScanActionType,
    example: ScanActionType.STAMP,
  })
  @IsEnum(ScanActionType, { message: 'action must be either STAMP or REDEEM' })
  @IsNotEmpty()
  action: ScanActionType;

  @ApiProperty({
    description: 'Merchant ID performing the scan (UUID)',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsUUID('4', { message: 'merchantId must be a valid UUID v4' })
  @IsNotEmpty()
  merchantId: string;

  @ApiPropertyOptional({
    description: 'User ID of the staff or owner who performed the scan (UUID)',
    example: 'b0000000-0000-0000-0000-000000000002',
  })
  @IsOptional()
  @IsUUID('4', { message: 'createdByUserId must be a valid UUID v4' })
  createdByUserId?: string;
}

export class MaskedCustomerDto {
  @ApiProperty({ description: 'Customer ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Masked RUT for cashier privacy', example: '12.***.*78-5' })
  rut?: string | null;

  @ApiPropertyOptional({ description: 'Masked phone for cashier privacy', example: '+56 9 **** 5678' })
  phone?: string | null;
}

export class ScanResultDto {
  @ApiProperty({ description: 'Indicates whether the scan succeeded', example: true })
  success: boolean;

  @ApiProperty({
    description: 'True if duplicate stamp was ignored within the 90-second anti-fraud window',
    example: false,
  })
  alreadyScanned: boolean;

  @ApiProperty({ description: 'Action executed', enum: ScanActionType, example: ScanActionType.STAMP })
  action: ScanActionType;

  @ApiProperty({ description: 'Pass ID (UUID)' })
  passId: string;

  @ApiProperty({ description: 'Current number of active, non-expired, non-consumed stamps', example: 5 })
  activeStamps: number;

  @ApiProperty({ description: 'Target stamps required to unlock the promotion reward', example: 10 })
  targetStamps: number;

  @ApiProperty({ description: 'True if activeStamps >= targetStamps', example: false })
  rewardUnlocked: boolean;

  @ApiProperty({ description: 'Name of the unlocked or targeted reward', example: 'Café de especialidad gratis' })
  rewardName: string;

  @ApiPropertyOptional({ description: 'Next stamp expiration timestamp, if any' })
  nextExpiryAt?: Date | null;

  @ApiPropertyOptional({ description: 'Created Scan ID (UUID)' })
  scanId?: string;

  @ApiPropertyOptional({ description: 'Number of stamps consumed in this redeem action' })
  consumedStampsCount?: number;

  @ApiPropertyOptional({ description: 'Masked customer details' })
  customer?: MaskedCustomerDto;

  @ApiPropertyOptional({ description: 'Human-readable result message' })
  message?: string;
}
