import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ScanActionDto, ScanResultDto } from './dto/scan-action.dto.js';
import { ScanService } from './scan.service.js';

@ApiTags('Cashier Scanner (PWA)')
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process pass scan: add stamp or redeem reward',
    description:
      'Performs transactional pass validation, 90-second anti-duplicate check, FIFO stamp consumption on redeem, and returns updated active stamp balance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Scan processed successfully (or duplicate safely ignored within 90s window)',
    type: ScanResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid action or insufficient stamps for redemption' })
  @ApiResponse({ status: 403, description: 'Pass does not belong to the requesting merchant' })
  @ApiResponse({ status: 404, description: 'Pass token not found' })
  async scanPass(@Body() dto: ScanActionDto): Promise<ScanResultDto> {
    return this.scanService.processScan(dto);
  }
}
