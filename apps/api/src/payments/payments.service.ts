import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { Payment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth-user';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreatePaymentDto): Promise<Payment> {
    // No gateway wired up yet, so everything starts "pending" until
    // confirmPayment() is called.
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
      throw new ForbiddenException();
    }
    return payment;
  }

  // TODO: this should be driven by the gateway webhook, not the client.
  async confirmPayment(user: AuthUser, id: string): Promise<Payment> {
    const payment = await this.findOneFor(user, id);
    return this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'succeeded' },
    });
  }

  // TODO: implement once the gateway refund API is decided on.
  refund(_id: string): never {
    throw new NotImplementedException('Refunds are not implemented yet');
  }
}
