import { Injectable } from '@nestjs/common';
import { GatewayResult, PaymentGateway } from './payment-gateway';

@Injectable()
export class FakeGatewayService implements PaymentGateway {
async charge(input: {
paymentId: string;
amount: number;
currency: string;
}): Promise<GatewayResult> {
const { paymentId, amount } = input;


if (amount % 100 === 13) {
  return {
    ok: false,
    reference: `FAKE-${paymentId}`,
    failureReason: 'Simulated payment failure',
  };
}

return {
  ok: true,
  reference: `FAKE-${paymentId}`,
};


}
}
