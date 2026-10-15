import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PayoutsService', () => {
  let service: PayoutsService;

  let prisma: {
    payment: {
      findUnique: jest.Mock;
    };
    payout: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
      },
      payout: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new PayoutsService(
      prisma as unknown as PrismaService,
    );
  });

  describe('createForSuccessfulPayment', () => {
    it('should create a pending payout for the request provider', async () => {
      const payment = {
        id: 'payment-1',
        requestId: 'request-1',
        providerAmount: 800,
        request: {
          providerId: 'provider-1',
        },
        payout: null,
      };

      const createdPayout = {
        id: 'payout-1',
        providerId: 'provider-1',
        paymentId: 'payment-1',
        amount: 800,
        status: 'pending',
      };

      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.payout.create.mockResolvedValue(createdPayout);

      const result =
        await service.createForSuccessfulPayment('payment-1');

      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        include: {
          request: {
            select: {
              providerId: true,
            },
          },
          payout: true,
        },
      });

      expect(prisma.payout.create).toHaveBeenCalledWith({
        data: {
          providerId: 'provider-1',
          paymentId: 'payment-1',
          amount: 800,
        },
      });

      expect(result).toEqual(createdPayout);
    });

    it('should not create a payout when the payment has no request', async () => {
      const payment = {
        id: 'payment-2',
        requestId: null,
        providerAmount: 500,
        request: null,
        payout: null,
      };

      prisma.payment.findUnique.mockResolvedValue(payment);

      const result =
        await service.createForSuccessfulPayment('payment-2');

      expect(result).toBeNull();
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('should not create a duplicate payout', async () => {
      const existingPayout = {
        id: 'payout-1',
        providerId: 'provider-1',
        paymentId: 'payment-1',
        amount: 800,
        status: 'pending',
      };

      const payment = {
        id: 'payment-1',
        requestId: 'request-1',
        providerAmount: 800,
        request: {
          providerId: 'provider-1',
        },
        payout: existingPayout,
      };

      prisma.payment.findUnique.mockResolvedValue(payment);

      const result =
        await service.createForSuccessfulPayment('payment-1');

      expect(result).toEqual(existingPayout);
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('should throw an error when the payment does not exist', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.createForSuccessfulPayment('unknown-payment'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.payout.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelForRefund', () => {
    it('should cancel a pending payout', async () => {
      const pendingPayout = {
        id: 'payout-1',
        providerId: 'provider-1',
        paymentId: 'payment-1',
        amount: 800,
        status: 'pending',
      };

      const cancelledPayout = {
        ...pendingPayout,
        status: 'cancelled',
      };

      prisma.payout.findUnique.mockResolvedValue(pendingPayout);
      prisma.payout.update.mockResolvedValue(cancelledPayout);

      const result = await service.cancelForRefund('payment-1');

      expect(prisma.payout.findUnique).toHaveBeenCalledWith({
        where: { paymentId: 'payment-1' },
      });

      expect(prisma.payout.update).toHaveBeenCalledWith({
        where: { id: 'payout-1' },
        data: {
          status: 'cancelled',
        },
      });

      expect(result).toEqual(cancelledPayout);
    });

    it('should refuse to cancel a payout that is already paid', async () => {
      const paidPayout = {
        id: 'payout-1',
        providerId: 'provider-1',
        paymentId: 'payment-1',
        amount: 800,
        status: 'paid',
      };

      prisma.payout.findUnique.mockResolvedValue(paidPayout);

      await expect(
        service.cancelForRefund('payment-1'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.payout.update).not.toHaveBeenCalled();
    });

    it('should return null when no payout exists', async () => {
      prisma.payout.findUnique.mockResolvedValue(null);

      const result = await service.cancelForRefund('payment-1');

      expect(result).toBeNull();
      expect(prisma.payout.update).not.toHaveBeenCalled();
    });

    it('should not update an already cancelled payout', async () => {
      const cancelledPayout = {
        id: 'payout-1',
        providerId: 'provider-1',
        paymentId: 'payment-1',
        amount: 800,
        status: 'cancelled',
      };

      prisma.payout.findUnique.mockResolvedValue(cancelledPayout);

      const result = await service.cancelForRefund('payment-1');

      expect(result).toEqual(cancelledPayout);
      expect(prisma.payout.update).not.toHaveBeenCalled();
    });
  });
});