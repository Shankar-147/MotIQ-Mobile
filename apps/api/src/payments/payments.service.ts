import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { Page, skipTake } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQuery } from './dto/list-payments.query';
import { FareService } from './fare.service';
import { PayoutsService } from './payouts.service';
import { Inject } from '@nestjs/common';

import {
  PAYMENT_GATEWAY,
  PaymentGateway,
} from './gateway/payment-gateway';
export type PaymentWithUser = Payment & { user: { phoneNumber: string; name: string | null } };

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fare: FareService,
    private readonly payoutsService: PayoutsService,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: PaymentGateway,
  ) {}

  // Every payment starts as "pending". There is no payment gateway yet, so
  // confirm() below stands in for the gateway telling us the money arrived.
  create(userId: string, dto: CreatePaymentDto): Promise<Payment> {
    return this.prisma.payment.create({
      data: { userId, amount: dto.amount, currency: dto.currency },
    });
  }

  // Called when a provider finishes a job. The customer is charged the fare
  // and the amount is split between the platform and the provider.
  createForRequest(request: { id: string; customerId: string; fareTotal: number }): Promise<Payment> {
    const { commission, providerAmount } = this.fare.split(request.fareTotal);
    return this.prisma.payment.create({
      data: {
        userId: request.customerId,
        requestId: request.id,
        amount: request.fareTotal,
        commissionAmount: commission,
        providerAmount,
        currency: 'INR',
      },
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
const payment = await this.prisma.payment.findUnique({
where: { id },
});

if (!payment) {
throw new NotFoundException('Payment not found');
}

// Prevent users from confirming payments they do not own.
// Keep the authorization rule consistent with your existing service.
if (payment.userId !== user.id && user.role !== 'admin') {
throw new ForbiddenException('You cannot confirm this payment');
}
if (payment.status === 'refunded') {
  throw new BadRequestException(
    'A refunded payment cannot be confirmed',
  );
}

// Do not charge the gateway again for a successful payment.
if (payment.status === 'succeeded') {
return payment;
}


const result = await this.gateway.charge({
paymentId: payment.id,
amount: payment.amount,
currency: payment.currency,
});

if (result.ok) {
  const updatedPayment = await this.prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'succeeded',
      gatewayReference: result.reference,
    },
  });

  // Create a payout for the provider.
  // The service skips payments without a request
  // and prevents duplicate payouts.
  await this.payoutsService.createForSuccessfulPayment(payment.id);

  return updatedPayment;
}

return this.prisma.payment.update({
where: { id: payment.id },
data: {
status: 'failed',
},
});
}


async refund(id: string): Promise<Payment> {
  const payment = await this.prisma.payment.findUnique({
    where: { id },
  });

  if (!payment) {
    throw new NotFoundException(`Payment ${id} not found`);
  }

  if (payment.status !== 'succeeded') {
    throw new BadRequestException(
      'Only succeeded payments can be refunded',
    );
  }

  // Cancel the payout if it is pending.
  // If it has already been paid, this throws BadRequestException.
  await this.payoutsService.cancelForRefund(payment.id);

  // Mark the payment as refunded.
  return this.prisma.payment.update({
    where: { id },
    data: { status: 'refunded' },
  });
}

  // What a provider has earned. "Paid" is money the customer has paid;
  // "waiting" is for completed jobs the customer has not paid for yet.
  async earningsFor(providerId: string) {
    const jobs = await this.prisma.payment.findMany({
      where: { request: { providerId } },
      orderBy: { createdAt: 'desc' },
      include: { request: { select: { issueType: true, areaName: true, completedAt: true } } },
    });

    let paid = 0;
    let waiting = 0;
    for (const job of jobs) {
      if (job.status === 'succeeded') paid += job.providerAmount;
      if (job.status === 'pending') waiting += job.providerAmount;
    }
    return { paid, waiting, jobs };
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

  // Counts per status, how much money has been collected, and how much of
  // that is the platform's commission.
  async summary() {
    const byStatus = await this.prisma.payment.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const collected = await this.prisma.payment.groupBy({
      by: ['currency'],
      where: { status: 'succeeded' },
      _sum: { amount: true, commissionAmount: true },
    });

    const counts = { pending: 0, succeeded: 0, failed: 0, refunded: 0 };
    for (const row of byStatus) counts[row.status] = row._count._all;

    return {
      counts,
      collected: collected.map((row) => ({
        currency: row.currency,
        amount: row._sum.amount ?? 0,
        commission: row._sum.commissionAmount ?? 0,
      })),
    };
  }
}
