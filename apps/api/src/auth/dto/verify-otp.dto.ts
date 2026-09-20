import { IsPhoneNumber, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber('IN')
  phoneNumber!: string;

  @Length(6, 6)
  code!: string;
}
