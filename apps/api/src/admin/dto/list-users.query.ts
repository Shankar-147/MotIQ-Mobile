import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQuery } from '../../common/pagination';

export class ListUsersQuery extends PageQuery {
  // Part of a phone number or a name.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  search?: string;

  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';
}
