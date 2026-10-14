import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// A customer rating the provider after a completed job.
export class RateRequestDto {
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  comment?: string;
}
