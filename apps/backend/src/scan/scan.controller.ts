import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { ScanActionDto, ScanResultDto } from './dto/scan-action.dto.js';
import { ScanService } from './scan.service.js';

@ApiTags('Cashier Scanner (PWA)')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process pass scan: add stamp or redeem reward',
    description:
      'Performs transactional pass validation, atomic 90-second anti-duplicate check, FIFO stamp consumption on redeem, and returns updated active stamp balance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Scan processed successfully (or duplicate safely ignored within 90s window)',
    type: ScanResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid action or insufficient stamps for redemption' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Pass does not belong to the requesting merchant' })
  @ApiResponse({ status: 404, description: 'Pass token not found' })
  async scanPass(
    @Body() dto: ScanActionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ScanResultDto> {
    return this.scanService.processScan(dto, user?.id);
  }
}
