import { IsIn, IsOptional } from 'class-validator';
import { PageQuery } from '../../common/pagination';

export class ListProvidersQuery extends PageQuery {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  verification?: 'pending' | 'approved' | 'rejected';
}
