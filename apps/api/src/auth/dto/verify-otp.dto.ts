import { IsOptional, IsPhoneNumber, IsString, Length, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber('IN')
  phoneNumber!: string;

  @Length(6, 6)
  code!: string;

  // Only used the first time a number logs in.
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;
}
