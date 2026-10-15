import { FakeGatewayService } from './fake-gateway.service';

describe('FakeGatewayService', () => {
let gateway: FakeGatewayService;

beforeEach(() => {
gateway = new FakeGatewayService();
});

it('should successfully process a normal payment', async () => {
const result = await gateway.charge({
paymentId: 'payment-101',
amount: 1200,
currency: 'INR',
});


expect(result.ok).toBe(true);
expect(result.reference).toBe('FAKE-payment-101');


});

it('should fail when the amount ends in 13 paise', async () => {
const result = await gateway.charge({
paymentId: 'payment-102',
amount: 1213,
currency: 'INR',
});


expect(result.ok).toBe(false);
expect(result.failureReason).toBe(
  'Simulated payment failure',
);


});

it('should include the payment ID in the reference', async () => {
const result = await gateway.charge({
paymentId: 'payment-103',
amount: 1500,
currency: 'INR',
});

expect(result.reference).toBe('FAKE-payment-103');


});
});
