import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BillingModule } from './billing/billing.module.js';
import { CardsModule } from './cards/cards.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { HealthModule } from './health/health.module.js';
import { InternalModule } from './internal/internal.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { MerchantsModule } from './merchants/merchants.module.js';
import { PassesModule } from './passes/passes.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { ScanModule } from './scan/scan.module.js';
import { StaffModule } from './staff/staff.module.js';
import { SupportModule } from './support/support.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 60,
      },
    ]),
    PrismaModule,
    CustomersModule,
    MerchantsModule,
    StaffModule,
    ScanModule,
    PassesModule,
    CardsModule,
    SupportModule,
    BillingModule,
    ReportsModule,
    LocationsModule,
    InternalModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
