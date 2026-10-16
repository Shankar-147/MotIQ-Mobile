import { IsIn, IsInt, IsPositive } from 'class-validator';

const SUPPORTED_CURRENCIES = ['INR', 'USD'] as const;


export class CreatePaymentDto {
  @IsInt()
  @IsPositive()
  amount!: number; 

  @IsIn(SUPPORTED_CURRENCIES)
  currency!: (typeof SUPPORTED_CURRENCIES)[number];
}
