export interface GatewayResult {
ok: boolean;
reference: string;
failureReason?: string;
}

export interface PaymentGateway {
charge(input: {
paymentId: string;
amount: number;
currency: string;
}): Promise<GatewayResult>;
}

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';
