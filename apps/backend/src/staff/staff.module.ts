import { Module } from '@nestjs/common';
import { UserDirectoryService } from '../common/users/user-directory.service.js';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

@Module({
  controllers: [StaffController],
  providers: [StaffService, UserDirectoryService],
  exports: [StaffService],
})
export class StaffModule {}
