import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { Page, skipTake } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQuery } from './dto/list-payments.query';

export type PaymentWithUser = Payment & { user: { phoneNumber: string; name: string | null } };

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Every payment starts as "pending". There is no payment gateway yet, so
  // confirm() below stands in for the gateway telling us the money arrived.
  create(userId: string, dto: CreatePaymentDto): Promise<Payment> {
    return this.prisma.payment.create({
      data: { userId, amount: dto.amount, currency: dto.currency },
    });
  }

  findAllForUser(userId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneFor(user: AuthUser, id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    if (payment.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('This payment belongs to someone else');
    }
    return payment;
  }

  async confirm(user: AuthUser, id: string): Promise<Payment> {
    const payment = await this.findOneFor(user, id);
    if (payment.status === 'failed' || payment.status === 'refunded') {
      throw new BadRequestException(`Cannot confirm a ${payment.status} payment`);
    }
    if (payment.status === 'succeeded') {
      return payment; // confirming twice is harmless
    }
    return this.prisma.payment.update({ where: { id }, data: { status: 'succeeded' } });
  }

  async refund(id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    if (payment.status !== 'succeeded') {
      throw new BadRequestException('Only succeeded payments can be refunded');
    }
    return this.prisma.payment.update({ where: { id }, data: { status: 'refunded' } });
  }

  // Admin view: every payment, with the owner's phone number.
  async listAll(query: ListPaymentsQuery): Promise<Page<PaymentWithUser>> {
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { phoneNumber: true, name: true } } },
        ...skipTake(query),
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  // Counts per status, and how much money has actually been collected.
  async summary() {
    const byStatus = await this.prisma.payment.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const collected = await this.prisma.payment.groupBy({
      by: ['currency'],
      where: { status: 'succeeded' },
      _sum: { amount: true },
    });

    const counts = { pending: 0, succeeded: 0, failed: 0, refunded: 0 };
    for (const row of byStatus) counts[row.status] = row._count._all;

    return {
      counts,
      collected: collected.map((row) => ({ currency: row.currency, amount: row._sum.amount ?? 0 })),
    };
  }
}
