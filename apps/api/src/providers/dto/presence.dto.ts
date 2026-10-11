import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PresenceDto {
  @IsBoolean()
  online!: boolean;

  // One of the names from GET /areas. The coordinates are looked up on the
  // server, so a client cannot invent a location.
  @IsOptional()
  @IsString()
  areaName?: string;
}
