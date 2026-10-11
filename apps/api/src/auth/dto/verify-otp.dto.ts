import { IsIn, IsOptional, IsPhoneNumber, IsString, Length, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber('IN')
  phoneNumber!: string;

  @Length(6, 6)
  code!: string;

  // The three fields below are only used the first time a number logs in.
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  // "user" is a customer asking for help; "provider" offers the service.
  @IsOptional()
  @IsIn(['user', 'provider'])
  role?: 'user' | 'provider';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  businessName?: string;
}
