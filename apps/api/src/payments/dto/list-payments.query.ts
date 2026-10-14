import { IsIn, IsOptional } from 'class-validator';
import { PageQuery } from '../../common/pagination';

export class ListPaymentsQuery extends PageQuery {
  @IsOptional()
  @IsIn(['pending', 'succeeded', 'failed', 'refunded'])
  status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
}
