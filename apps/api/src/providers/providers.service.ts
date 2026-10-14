import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProviderProfile, RequestStatus } from '@prisma/client';
import { findArea } from '../areas/areas';
import { Page, skipTake } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AddDocumentDto } from './dto/add-document.dto';
import { ListProvidersQuery } from './dto/list-providers.query';
import { PresenceDto } from './dto/presence.dto';
import { ReviewProviderDto } from './dto/review-provider.dto';

// While a provider has a request in one of these states they are busy and
// are not offered another job.
export const BUSY_STATUSES: RequestStatus[] = [
  'assigned',
  'accepted',
  'en_route',
  'arrived',
  'in_progress',
];

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
      include: { documents: { orderBy: { createdAt: 'desc' } } },
    });
    if (!profile) {
      throw new NotFoundException('No provider profile for this account');
    }
    return profile;
  }

  async addDocument(userId: string, dto: AddDocumentDto) {
    const profile = await this.findByUserId(userId);
    return this.prisma.providerDocument.create({
      data: { providerId: profile.id, type: dto.type, fileUrl: dto.fileUrl },
    });
  }

  // Going online needs an approved account and a known location.
  async setPresence(userId: string, dto: PresenceDto) {
    const profile = await this.findByUserId(userId);

    if (!dto.online) {
      return this.prisma.providerProfile.update({ where: { id: profile.id }, data: { online: false } });
    }
    if (profile.verification !== 'approved') {
      throw new ForbiddenException('Your account has not been approved yet');
    }

    let location = { areaName: profile.areaName, latitude: profile.latitude, longitude: profile.longitude };
    if (dto.areaName) {
      const area = findArea(dto.areaName);
      if (!area) {
        throw new BadRequestException(`Unknown area: ${dto.areaName}`);
      }
      location = { areaName: area.name, latitude: area.latitude, longitude: area.longitude };
    }
    if (location.latitude === null || location.longitude === null) {
      throw new BadRequestException('Choose the area you are waiting in before going online');
    }

    return this.prisma.providerProfile.update({
      where: { id: profile.id },
      data: { online: true, ...location },
    });
  }

  // Providers who could take a job right now: approved, online, with a
  // location, and not already on another job.
  findAvailable(excludeIds: string[] = []): Promise<ProviderProfile[]> {
    return this.prisma.providerProfile.findMany({
      where: {
        verification: 'approved',
        online: true,
        latitude: { not: null },
        longitude: { not: null },
        id: { notIn: excludeIds },
        requests: { none: { status: { in: BUSY_STATUSES } } },
      },
    });
  }

  // ---------------------------------------------------------- admin side

  async listForAdmin(query: ListProvidersQuery): Promise<Page<unknown>> {
    const where: Prisma.ProviderProfileWhereInput = query.verification
      ? { verification: query.verification }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.providerProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { phoneNumber: true, name: true } },
          _count: { select: { documents: true } },
        },
        ...skipTake(query),
      }),
      this.prisma.providerProfile.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getForAdmin(id: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { phoneNumber: true, name: true } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!profile) {
      throw new NotFoundException(`Provider ${id} not found`);
    }
    return profile;
  }

  // Approve or reject a provider. A provider with no documents cannot be
  // approved, and a rejected provider is taken offline straight away.
  async review(id: string, dto: ReviewProviderDto) {
    const profile = await this.getForAdmin(id);
    if (dto.decision === 'approved' && profile.documents.length === 0) {
      throw new BadRequestException('This provider has not uploaded any documents');
    }
    return this.prisma.providerProfile.update({
      where: { id },
      data: {
        verification: dto.decision,
        reviewNote: dto.note ?? null,
        reviewedAt: new Date(),
        ...(dto.decision === 'rejected' ? { online: false } : {}),
      },
    });
  }
}
