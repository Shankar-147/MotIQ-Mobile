import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const ISSUE_TYPES = ['flat_tyre', 'battery', 'fuel', 'towing', 'engine', 'other'] as const;

export class CreateRequestDto {
  @IsIn(ISSUE_TYPES)
  issueType!: (typeof ISSUE_TYPES)[number];

  // One of the names from GET /areas; the server looks up the coordinates.
  @IsString()
  areaName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  vehicle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
