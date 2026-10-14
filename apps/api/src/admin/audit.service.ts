import { Injectable } from '@nestjs/common';
import { AuditLog } from '@prisma/client';
import { Page, PageQuery, skipTake } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

// A permanent record of admin actions: who did what, to which record, when.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(actorId: string, action: string, targetId: string, detail?: string): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data: { actorId, action, targetId, detail } });
  }

  async list(query: PageQuery): Promise<Page<AuditLog>> {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, ...skipTake(query) }),
      this.prisma.auditLog.count(),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}
