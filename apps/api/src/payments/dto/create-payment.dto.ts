import { IsIn, IsInt, IsPositive } from 'class-validator';

const SUPPORTED_CURRENCIES = ['INR', 'USD'] as const;

// The user is not part of the body: it comes from the login token.
export class CreatePaymentDto {
  @IsInt()
  @IsPositive()
  amount!: number; // smallest currency unit, e.g. paise/cents

  @IsIn(SUPPORTED_CURRENCIES)
  currency!: (typeof SUPPORTED_CURRENCIES)[number];
}
