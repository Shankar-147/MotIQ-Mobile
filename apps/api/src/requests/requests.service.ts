import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RequestStatus, ServiceRequest } from '@prisma/client';
import { findArea } from '../areas/areas';
import { AuthUser } from '../auth/auth-user';
import { Page, skipTake } from '../common/pagination';
import { FareService } from '../payments/fare.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ListRequestsQuery } from './dto/list-requests.query';
import { MatchingService } from './matching.service';

// The steps a provider moves a job through. Anything else is refused.
const NEXT_STEP: Partial<Record<RequestStatus, RequestStatus>> = {
  accepted: 'en_route',
  en_route: 'arrived',
  arrived: 'in_progress',
  in_progress: 'completed',
};

// A customer may cancel until the work has actually started.
const CANCELLABLE: RequestStatus[] = ['requested', 'assigned', 'accepted', 'en_route', 'arrived'];

// States in which a provider is working on a request.
const ACTIVE: RequestStatus[] = ['accepted', 'en_route', 'arrived', 'in_progress'];

const providerSummary = {
  select: {
    id: true,
    businessName: true,
    areaName: true,
    user: { select: { name: true, phoneNumber: true } },
  },
} as const;

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly fare: FareService,
    private readonly payments: PaymentsService,
  ) {}

  // ----------------------------------------------------------- customer

  async create(customer: AuthUser, dto: CreateRequestDto): Promise<ServiceRequest> {
    if (customer.role !== 'user') {
      throw new ForbiddenException('Only customers can ask for help');
    }
    const area = findArea(dto.areaName);
    if (!area) {
      throw new BadRequestException(`Unknown area: ${dto.areaName}`);
    }

    const request = await this.prisma.serviceRequest.create({
      data: {
        customerId: customer.id,
        issueType: dto.issueType,
        vehicle: dto.vehicle,
        description: dto.description,
        areaName: area.name,
        latitude: area.latitude,
        longitude: area.longitude,
        baseFare: this.fare.baseFareFor(dto.issueType),
      },
    });
    return this.matching.assignNext(request.id);
  }

  findMine(customerId: string) {
    return this.prisma.serviceRequest.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { provider: providerSummary, payment: { select: { id: true, status: true } } },
    });
  }

  async findOneFor(user: AuthUser, id: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        provider: providerSummary,
        customer: { select: { name: true, phoneNumber: true } },
        payment: { select: { id: true, status: true, amount: true } },
      },
    });
    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    const isCustomer = request.customerId === user.id;
    const isAssignedProvider = await this.isProviderUser(request.providerId, user.id);
    if (!isCustomer && !isAssignedProvider && user.role !== 'admin') {
      throw new ForbiddenException('This request belongs to someone else');
    }
    return request;
  }

  async cancel(customerId: string, id: string): Promise<ServiceRequest> {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    if (request.customerId !== customerId) {
      throw new ForbiddenException('This request belongs to someone else');
    }
    if (!CANCELLABLE.includes(request.status)) {
      throw new BadRequestException(`A ${request.status} request cannot be cancelled`);
    }

    const [, cancelled] = await this.prisma.$transaction([
      // Any offer still waiting for an answer is withdrawn.
      this.prisma.requestOffer.updateMany({
        where: { requestId: id, status: 'offered' },
        data: { status: 'withdrawn', respondedAt: new Date() },
      }),
      this.prisma.serviceRequest.update({ where: { id }, data: { status: 'cancelled' } }),
    ]);
    return cancelled;
  }

  // "No provider found": try matching again, for example because someone
  // has since gone online.
  async retry(customerId: string, id: string): Promise<ServiceRequest> {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    if (request.customerId !== customerId) {
      throw new ForbiddenException('This request belongs to someone else');
    }
    if (request.status !== 'no_provider') {
      throw new BadRequestException('Only a request with no provider can be retried');
    }
    return this.matching.assignNext(id);
  }

  // ----------------------------------------------------------- provider

  // The offer waiting for this provider, and the job they are doing.
  async currentFor(userId: string) {
    const provider = await this.providerFor(userId);

    const offer = await this.prisma.serviceRequest.findFirst({
      where: { status: 'assigned', offers: { some: { providerId: provider.id, status: 'offered' } } },
      include: { customer: { select: { name: true } } },
    });
    const active = await this.prisma.serviceRequest.findFirst({
      where: { providerId: provider.id, status: { in: ACTIVE } },
      include: { customer: { select: { name: true, phoneNumber: true } } },
    });
    return { offer, active };
  }

  async historyFor(userId: string) {
    const provider = await this.providerFor(userId);
    return this.prisma.serviceRequest.findMany({
      where: { providerId: provider.id, status: { in: ['completed', 'cancelled'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { customer: { select: { name: true } } },
    });
  }

  async accept(userId: string, requestId: string): Promise<ServiceRequest> {
    const provider = await this.providerFor(userId);
    const offer = await this.openOffer(provider.id, requestId);

    const [, accepted] = await this.prisma.$transaction([
      this.prisma.requestOffer.update({
        where: { id: offer.id },
        data: { status: 'accepted', respondedAt: new Date() },
      }),
      this.prisma.serviceRequest.update({
        where: { id: requestId },
        data: { status: 'accepted', providerId: provider.id, acceptedAt: new Date() },
      }),
    ]);
    return accepted;
  }

  // Saying no hands the request to the next nearest provider.
  async reject(userId: string, requestId: string): Promise<{ status: string }> {
    const provider = await this.providerFor(userId);
    const offer = await this.openOffer(provider.id, requestId);

    await this.prisma.requestOffer.update({
      where: { id: offer.id },
      data: { status: 'rejected', respondedAt: new Date() },
    });
    await this.matching.assignNext(requestId);
    return { status: 'rejected' };
  }

  async advance(userId: string, requestId: string, status: RequestStatus): Promise<ServiceRequest> {
    const provider = await this.providerFor(userId);
    const request = await this.prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }
    if (request.providerId !== provider.id) {
      throw new ForbiddenException('This job is not assigned to you');
    }
    if (NEXT_STEP[request.status] !== status) {
      throw new BadRequestException(`A ${request.status} job cannot move to ${status}`);
    }

    const updated = await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: { status, ...(status === 'completed' ? { completedAt: new Date() } : {}) },
    });

    // Finishing the job is what creates the bill.
    if (status === 'completed') {
      await this.payments.createForRequest({
        id: updated.id,
        customerId: updated.customerId,
        fareTotal: updated.fareTotal ?? updated.baseFare,
      });
    }
    return updated;
  }

  // -------------------------------------------------------------- admin

  async listAll(query: ListRequestsQuery): Promise<Page<unknown>> {
    const where: Prisma.ServiceRequestWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phoneNumber: true } },
          provider: { select: { businessName: true } },
        },
        ...skipTake(query),
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async countByStatus(): Promise<Record<RequestStatus, number>> {
    const rows = await this.prisma.serviceRequest.groupBy({ by: ['status'], _count: { _all: true } });
    const counts = {
      requested: 0,
      assigned: 0,
      accepted: 0,
      en_route: 0,
      arrived: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      no_provider: 0,
    } as Record<RequestStatus, number>;
    for (const row of rows) counts[row.status] = row._count._all;
    return counts;
  }

  // ------------------------------------------------------------ helpers

  private async providerFor(userId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) {
      throw new NotFoundException('No provider profile for this account');
    }
    return provider;
  }

  private async openOffer(providerId: string, requestId: string) {
    const offer = await this.prisma.requestOffer.findFirst({
      where: { requestId, providerId, status: 'offered' },
    });
    if (!offer) {
      throw new NotFoundException('There is no open offer for you on this request');
    }
    return offer;
  }

  private async isProviderUser(providerId: string | null, userId: string): Promise<boolean> {
    if (!providerId) return false;
    const provider = await this.prisma.providerProfile.findUnique({ where: { id: providerId } });
    return provider?.userId === userId;
  }
}
