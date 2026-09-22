import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { StaffModule } from './staff/staff.module.js';
import { ScanModule } from './scan/scan.module.js';
import { PassesModule } from './passes/passes.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CustomersModule,
    StaffModule,
    ScanModule,
    PassesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
