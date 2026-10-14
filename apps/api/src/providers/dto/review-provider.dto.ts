import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewProviderDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
