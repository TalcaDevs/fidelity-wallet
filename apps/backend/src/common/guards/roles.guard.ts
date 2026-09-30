import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const merchantId = request.params.brandId || request.params.merchantId;
    if (!merchantId) return false;

    const membership = await this.prisma.brandMember.findUnique({
      where: { userId_brandId: { userId: user.id, brandId: merchantId } },
    });

    if (!membership || !roles.includes(membership.role)) {
      throw new ForbiddenException(`Solo roles permitidos: ${roles.join(', ')}`);
    }

    return true;
  }
}
