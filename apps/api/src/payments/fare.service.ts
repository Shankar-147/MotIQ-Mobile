import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IssueType } from '@prisma/client';

// All money is in paise (1 rupee = 100 paise), so there are no decimals.
export const BASE_FARE: Record<IssueType, number> = {
  flat_tyre: 25000, // 250.00
  battery: 30000,
  fuel: 20000,
  towing: 80000,
  engine: 50000,
  other: 35000,
};

export const PER_KM_CHARGE = 1000; // 10.00 for every km the provider travels

export interface FareBreakdown {
  baseFare: number;
  distanceCharge: number;
  total: number;
}

export interface FareSplit {
  commission: number;
  providerAmount: number;
}

@Injectable()
export class FareService {
  private readonly commissionPercent: number;

  constructor(config: ConfigService) {
    this.commissionPercent = Number(config.get('COMMISSION_PERCENT') ?? 15);
  }

  baseFareFor(issue: IssueType): number {
    return BASE_FARE[issue];
  }

  // Base fare for the kind of problem, plus a charge for how far the
  // provider has to travel.
  calculate(issue: IssueType, distanceKm: number): FareBreakdown {
    const baseFare = this.baseFareFor(issue);
    const distanceCharge = Math.round(distanceKm * PER_KM_CHARGE);
    return { baseFare, distanceCharge, total: baseFare + distanceCharge };
  }

  // The platform keeps a percentage; the provider gets the rest. The two
  // parts always add up exactly to the total.
  split(total: number): FareSplit {
    const commission = Math.round((total * this.commissionPercent) / 100);
    return { commission, providerAmount: total - commission };
  }

  get percent(): number {
    return this.commissionPercent;
  }
}
