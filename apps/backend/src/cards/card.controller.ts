import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CARD_IMAGE_KINDS,
  CARD_IMAGE_MAX_BYTES,
  type CardConfigDto,
  type CardImageUploadDto,
} from '@fidelity/shared';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import type { UploadedImage } from '../common/storage/image.js';
import { SaveCardDto, UploadCardImageDto } from './card.dto.js';
import { CardService } from './card.service.js';

@ApiTags('Card editor')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('brands/:brandId/card')
export class CardController {
  constructor(private readonly cards: CardService) {}

  @Get()
  @ApiOperation({ summary: 'Tarjeta de la marca: tipo, reglas, recompensas, diseño y detalles (solo OWNER)' })
  get(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CardConfigDto> {
    return this.cards.get(brandId, user.id);
  }

  @Put()
  @ApiOperation({
    summary: 'Guardar la tarjeta (solo OWNER)',
    description:
      'Guarda todo en una transacción y publica el diseño en Google Wallet: los pases ya guardados se actualizan en segundo plano.',
  })
  save(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Body() dto: SaveCardDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CardConfigDto> {
    return this.cards.save(brandId, user.id, dto);
  }

  @Post('images')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: CARD_IMAGE_MAX_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['kind', 'image'],
      properties: {
        kind: { type: 'string', enum: [...CARD_IMAGE_KINDS] },
        image: { type: 'string', format: 'binary', description: 'PNG, JPG o WebP, hasta 5 MB' },
      },
    },
  })
  @ApiOperation({
    summary: 'Subir una imagen de la tarjeta (solo OWNER)',
    description: 'La recodifica al tamaño de Google Wallet y devuelve su URL pública. Se usa al guardar la tarjeta.',
  })
  uploadImage(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Body() dto: UploadCardImageDto,
    @UploadedFile() image: UploadedImage | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CardImageUploadDto> {
    return this.cards.uploadImage(brandId, user.id, dto.kind, image);
  }
}
