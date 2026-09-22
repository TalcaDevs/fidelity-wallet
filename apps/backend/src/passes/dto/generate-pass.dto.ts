import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class GeneratePassDto {
  @ApiProperty({
    description: 'Customer ID (UUID)',
    example: 'c0000000-0000-0000-0000-000000000001',
  })
  @IsUUID('4', { message: 'customerId must be a valid UUID v4' })
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'Merchant ID (UUID)',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsUUID('4', { message: 'merchantId must be a valid UUID v4' })
  @IsNotEmpty()
  merchantId: string;
}

export class PassEmissionResponseDto {
  @ApiProperty({ description: 'Pass ID in database (UUID)' })
  passId: string;

  @ApiProperty({
    description: 'Unique cryptographic token encoded in QR code',
    example: '9c5e7b23cf41d2f62b7ae109b85c21dfa0134812f8659103847e1bcde5a70921',
  })
  passToken: string;

  @ApiProperty({
    description: 'URL to download or add the pass to Apple Wallet (.pkpass)',
    example: 'http://localhost:3000/api/passes/token-xyz/apple',
  })
  appleWalletUrl: string;

  @ApiProperty({
    description: 'URL to save the pass to Google Wallet',
    example: 'https://pay.google.com/gp/v/save/eyJhbGci...',
  })
  googleWalletUrl: string;

  @ApiProperty({ description: 'Current active stamp count', example: 0 })
  activeStamps: number;

  @ApiProperty({ description: 'Target stamps required for reward', example: 10 })
  targetStamps: number;

  @ApiProperty({ description: 'Name of the reward', example: 'Café Gratis' })
  rewardName: string;

  @ApiPropertyOptional({ description: 'Next stamp expiration date, if any' })
  nextExpiryAt?: Date | null;
}
