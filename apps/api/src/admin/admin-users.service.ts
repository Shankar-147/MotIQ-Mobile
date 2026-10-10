import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AdminPaymentView = Payment & { user: { phoneNumber: string } };

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async updateStatus(actingAdminId: string, id: string, status: UserStatus): Promise<User> {
    if (id === actingAdminId) {
      throw new BadRequestException("You can't change your own status");
    }
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  findAllPayments(): Promise<AdminPaymentView[]> {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { phoneNumber: true } } },
    });
  }
}
