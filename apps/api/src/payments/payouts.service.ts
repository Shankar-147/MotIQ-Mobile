import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a pending payout for a successfully paid request.
   *
   * Rules:
   * 1. The payment must exist.
   * 2. The payment must belong to a request.
   * 3. The payout goes to the request's provider.
   * 4. The payout amount is the providerAmount.
   * 5. A payment must not have duplicate payouts.
   */
  async createForSuccessfulPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        request: {
          select: {
            providerId: true,
          },
        },
        payout: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Payments without requests do not generate payouts.
    if (
  !payment.requestId ||
  !payment.request ||
  !payment.request.providerId
) {
  return null;
}

    // Prevent duplicate payouts if this payment is processed again.
    if (payment.payout) {
      return payment.payout;
    }

    // Create a pending payout for the provider.
    return this.prisma.payout.create({
      data: {
        providerId: payment.request.providerId,
        paymentId: payment.id,
        amount: payment.providerAmount,
      },
    });
  }

  /**
   * Cancels a payout when its payment is refunded.
   *
   * A pending payout can be cancelled.
   * A paid payout cannot be refunded through this operation.
   */
  async cancelForRefund(paymentId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { paymentId },
    });

    // No payout exists for this payment.
    if (!payout) {
      return null;
    }

    // A payout that has already been paid cannot be cancelled.
    if (payout.status === 'paid') {
      throw new BadRequestException(
        'Cannot refund a payment whose payout has already been paid',
      );
    }

    // Do not update a payout that is already cancelled.
    if (payout.status === 'cancelled') {
      return payout;
    }

    // Cancel a pending payout.
    return this.prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: 'cancelled',
      },
    });
  }
}