import { Module } from '@nestjs/common';
import { PassesModule } from '../passes/passes.module.js';
import { CardAssetsStorageService } from './card-assets-storage.service.js';
import { CardPublicController } from './card-public.controller.js';
import { CardRenderService } from './card-render.service.js';
import { CardController } from './card.controller.js';
import { CardService } from './card.service.js';

@Module({
  imports: [PassesModule],
  controllers: [CardController, CardPublicController],
  providers: [CardService, CardRenderService, CardAssetsStorageService],
})
export class CardsModule {}
