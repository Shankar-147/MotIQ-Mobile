import { Injectable } from '@nestjs/common';
import { ProviderProfile, ServiceRequest } from '@prisma/client';
import { distanceKm } from '../common/geo';
import { FareService } from '../payments/fare.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from '../providers/providers.service';

export interface Nearest {
  provider: ProviderProfile;
  distanceKm: number;
}

// The provider with the smallest distance to the customer, or null.
export function pickNearest(
  providers: ProviderProfile[],
  latitude: number,
  longitude: number,
): Nearest | null {
  let best: Nearest | null = null;
  for (const provider of providers) {
    if (provider.latitude === null || provider.longitude === null) continue;
    const km = distanceKm(latitude, longitude, provider.latitude, provider.longitude);
    if (best === null || km < best.distanceKm) {
      best = { provider, distanceKm: km };
    }
  }
  return best;
}

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProvidersService,
    private readonly fare: FareService,
  ) {}

  /**
   * Offers the request to the nearest available provider that has not been
   * asked yet. If nobody is available the request becomes "no_provider".
   * Called when a request is created, and again each time a provider says no.
   */
  async assignNext(requestId: string): Promise<ServiceRequest> {
    const request = await this.prisma.serviceRequest.findUniqueOrThrow({ where: { id: requestId } });

    const alreadyAsked = await this.prisma.requestOffer.findMany({
      where: { requestId },
      select: { providerId: true },
    });
    const candidates = await this.providers.findAvailable(alreadyAsked.map((o) => o.providerId));
    const nearest = pickNearest(candidates, request.latitude, request.longitude);

    if (!nearest) {
      return this.prisma.serviceRequest.update({
        where: { id: requestId },
        data: { status: 'no_provider', distanceKm: null, fareTotal: null },
      });
    }

    // One decimal place is plenty for a distance shown to a person.
    const km = Math.round(nearest.distanceKm * 10) / 10;
    const { total } = this.fare.calculate(request.issueType, km);

    const [, updated] = await this.prisma.$transaction([
      this.prisma.requestOffer.create({ data: { requestId, providerId: nearest.provider.id } }),
      this.prisma.serviceRequest.update({
        where: { id: requestId },
        data: { status: 'assigned', distanceKm: km, fareTotal: total },
      }),
    ]);
    return updated;
  }
}
