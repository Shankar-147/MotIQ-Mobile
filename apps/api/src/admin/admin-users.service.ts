import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { Page, skipTake } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { ListUsersQuery } from './dto/list-users.query';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: ListUsersQuery): Promise<Page<User>> {
    const where: Prisma.UserWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      const term = query.search.replace(/\s/g, '');
      where.OR = [
        { phoneNumber: { contains: term } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, ...skipTake(query) }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async updateStatus(adminId: string, id: string, status: UserStatus): Promise<User> {
    if (id === adminId) {
      throw new BadRequestException("You can't change your own status");
    }
    const user = await this.findOne(id);
    if (user.status === status) {
      throw new BadRequestException(`User is already ${status}`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status, suspendedAt: status === 'suspended' ? new Date() : null },
    });
    await this.audit.record(
      adminId,
      status === 'suspended' ? 'user.suspended' : 'user.reactivated',
      id,
      user.phoneNumber,
    );
    return updated;
  }

  async countByStatus(): Promise<Record<UserStatus, number>> {
    const rows = await this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } });
    const counts: Record<UserStatus, number> = { active: 0, suspended: 0 };
    for (const row of rows) counts[row.status] = row._count._all;
    return counts;
  }
}
