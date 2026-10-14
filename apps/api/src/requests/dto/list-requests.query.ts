import { IsIn, IsOptional } from 'class-validator';
import { PageQuery } from '../../common/pagination';

const STATUSES = [
  'requested',
  'assigned',
  'accepted',
  'en_route',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'no_provider',
] as const;

export class ListRequestsQuery extends PageQuery {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
