import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { STAMPS_TARGET_MAX } from '@fidelity/shared';
import { CardRenderService } from './card-render.service.js';

// La versión del diseño va en la URL: lo que se sirve en una URL no cambia nunca.
const IMMUTABLE = 'public, max-age=31536000, immutable';

const png = (buffer: Buffer) => new StreamableFile(buffer, { type: 'image/png' });

/** Imágenes que Google Wallet descarga sin sesión. No exponen datos de clientes. */
@ApiTags('Card editor')
@Controller('public/cards/:programId/:version')
export class CardPublicController {
  constructor(private readonly render: CardRenderService) {}

  @Get('strip/:target/:filled')
  @Header('Cache-Control', IMMUTABLE)
  @ApiOperation({ summary: 'Tira de sellos del pase (heroImage de Google Wallet)' })
  async strip(
    @Param('programId', new ParseUUIDPipe()) programId: string,
    @Param('version', ParseIntPipe) version: number,
    @Param('target', ParseIntPipe) target: number,
    @Param('filled', ParseIntPipe) filled: number,
  ): Promise<StreamableFile> {
    if (version < 1 || target < 1 || target > STAMPS_TARGET_MAX || filled < 0 || filled > target) {
      throw new NotFoundException('Imagen no encontrada');
    }
    return png(await this.render.strip(programId, version, target, filled));
  }

  @Get('logo')
  @Header('Cache-Control', IMMUTABLE)
  @ApiOperation({ summary: 'Logo de reemplazo cuando la marca no subió uno (Google lo exige)' })
  async logo(
    @Param('programId', new ParseUUIDPipe()) programId: string,
    @Param('version', ParseIntPipe) version: number,
  ): Promise<StreamableFile> {
    if (version < 1) throw new NotFoundException('Imagen no encontrada');
    return png(await this.render.logo(programId, version));
  }
}
