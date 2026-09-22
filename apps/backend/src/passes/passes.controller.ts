import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GeneratePassDto, PassEmissionResponseDto } from './dto/generate-pass.dto.js';
import { PassesService } from './passes.service.js';

@ApiTags('Wallet Passes & Engine')
@Controller()
export class PassesController {
  private readonly logger = new Logger(PassesController.name);

  constructor(private readonly passesService: PassesService) {}

  @Post('passes/generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate Apple Wallet and Google Wallet passes for customer',
    description:
      'Creates a pass with a secure entropy-based passToken and returns both Apple Wallet (.pkpass) and Google Wallet save URLs.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pass URLs generated successfully',
    type: PassEmissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'No active promotion configured' })
  @ApiResponse({ status: 404, description: 'Customer or Merchant not found' })
  async generatePass(@Body() dto: GeneratePassDto): Promise<PassEmissionResponseDto> {
    return this.passesService.generatePass(dto);
  }

  @Get('passes/:passToken/apple')
  @ApiOperation({
    summary: 'Download signed Apple Wallet pass (.pkpass)',
    description: 'Returns the .pkpass file binary with application/vnd.apple.pkpass MIME type.',
  })
  @ApiResponse({ status: 200, description: 'Binary .pkpass file stream' })
  @ApiResponse({ status: 404, description: 'Pass not found' })
  async downloadApplePass(
    @Param('passToken') passToken: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.passesService.getApplePassBuffer(passToken);

    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename="loyalty-pass.pkpass"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  // --- Apple PassKit Web Service Protocol Endpoints ---

  @Post('v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apple PassKit Web Service: Register device for pass push notifications',
  })
  async registerDevice(
    @Param('deviceLibraryIdentifier') deviceId: string,
    @Param('passTypeIdentifier') passTypeId: string,
    @Param('serialNumber') serialNumber: string,
    @Body() body: { pushToken?: string },
    @Headers('authorization') _authHeader?: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `[PassKit WS] Device registration: device=${deviceId}, pass=${passTypeId}/${serialNumber}, pushToken=${body?.pushToken}`,
    );
    return { message: 'Device registered successfully' };
  }

  @Get('v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier')
  @ApiOperation({
    summary: 'Apple PassKit Web Service: Get serial numbers of passes modified since tag',
  })
  async getSerialNumbers(
    @Param('deviceLibraryIdentifier') _deviceId: string,
    @Param('passTypeIdentifier') _passTypeId: string,
  ): Promise<{ lastUpdated: string; serialNumbers: string[] }> {
    return {
      lastUpdated: new Date().toISOString(),
      serialNumbers: [],
    };
  }

  @Get('v1/passes/:passTypeIdentifier/:serialNumber')
  @ApiOperation({
    summary: 'Apple PassKit Web Service: Download latest version of pass',
  })
  async getLatestPass(
    @Param('passTypeIdentifier') _passTypeId: string,
    @Param('serialNumber') serialNumber: string,
    @Res() res: Response,
  ): Promise<void> {
    // In our system, serialNumber is the pass ID
    const buffer = await this.passesService.getApplePassBuffer(serialNumber);

    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename="loyalty-pass.pkpass"');
    res.send(buffer);
  }

  @Delete('v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apple PassKit Web Service: Unregister device',
  })
  async unregisterDevice(
    @Param('deviceLibraryIdentifier') deviceId: string,
    @Param('serialNumber') serialNumber: string,
  ): Promise<{ message: string }> {
    this.logger.log(`[PassKit WS] Device unregistration: device=${deviceId}, pass=${serialNumber}`);
    return { message: 'Device unregistered successfully' };
  }

  @Post('v1/log')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apple PassKit Web Service: Client error logging',
  })
  async logPassKitError(@Body() logs: { logs?: string[] }): Promise<{ message: string }> {
    this.logger.warn(`[PassKit WS Client Error Log]: ${JSON.stringify(logs)}`);
    return { message: 'Logs received' };
  }
}
