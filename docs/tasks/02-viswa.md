# Viswa: Payment gateway and payouts

Module: **Payments + Fare and Commission** (you already own it).
Branch: `feature/payouts`. PR reviewed by: Shankararam.

## What and why

Today `confirm` in `PaymentsService` just flips a payment to `succeeded`; the
comment above `create` says there is no gateway. And the platform records what
the provider is owed (`providerAmount`) but has no way to pay them.

You add two things:

1. **A payment gateway behind an interface**, with a fake sandbox
   implementation. `confirm` goes through the gateway and can now fail.
2. **A payout ledger**: when a customer's payment succeeds, a payout row is
   created for the provider. It stays `pending` until an admin marks it
   `paid`.

This turns two "not done" features (payment gateway, bank payouts) into done,
in sandbox form. Say "sandbox" in the viva; do not claim real banking.

## Design

### Gateway

```
apps/api/src/payments/gateway/payment-gateway.ts      interface + token
apps/api/src/payments/gateway/fake-gateway.service.ts the sandbox
apps/api/src/payments/gateway/fake-gateway.service.spec.ts
```

```ts
export interface GatewayResult { ok: boolean; reference: string; failureReason?: string }
export interface PaymentGateway {
  charge(input: { paymentId: string; amount: number; currency: string }): Promise<GatewayResult>;
}
export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';
```

The fake gateway always succeeds and returns a reference like `FAKE-<id>`,
**except** when `amount % 100 === 13` (a test hook so a failure can be shown).
Register it in `PaymentsModule`:
`{ provide: PAYMENT_GATEWAY, useClass: FakeGatewayService }`.

`PaymentsService.confirm` then:

1. loads the payment as today (owner or admin);
2. calls `gateway.charge(...)`;
3. on `ok`: `status = succeeded`, store `gatewayReference`, create the payout;
4. on failure: `status = failed`.

**Decision you must make and write down in the PR:** today a `failed`
payment cannot be confirmed again (there is a test for it), so a customer
whose payment failed is stuck. Either allow a retry from `failed` (change the
rule and update that test) or keep it and explain how the customer recovers.
I would allow the retry.

### Payouts

Schema (add in your own block at the end of `schema.prisma`):

```prisma
enum PayoutStatus { pending paid cancelled }

model Payout {
  id         String          @id @default(uuid())
  providerId String
  provider   ProviderProfile @relation(fields: [providerId], references: [id])
  paymentId  String          @unique
  payment    Payment         @relation(fields: [paymentId], references: [id])
  amount     Int
  status     PayoutStatus    @default(pending)
  createdAt  DateTime        @default(now())
  paidAt     DateTime?

  @@index([providerId])
}
```

Also add `gatewayReference String?` to `Payment`, and the back-relations
(`payouts Payout[]` on `ProviderProfile`, `payout Payout?` on `Payment`).

Rules:

- A payout is created only when a payment **with a request** succeeds
  (`requestId` set), for `providerAmount`, to the request's provider.
  Confirming twice must not create two (the `@unique` on `paymentId` backs
  this up, but check in code).
- Refunding a payment cancels its payout **if it is still `pending`**. If it
  was already `paid`, the refund is refused with a clear message.
- An admin can mark a `pending` payout `paid`. Paying twice is harmless.
  Paying a `cancelled` payout is a 400.

New files:

```
apps/api/src/payments/payouts.service.ts        (+ .spec.ts)
apps/api/src/payments/payouts.controller.ts     GET  /providers/me/payouts     (ProviderGuard)
```

Admin routes in `admin.controller.ts`:

```
GET  /admin/payouts?status=&page=&pageSize=
POST /admin/payouts/:id/pay      -> audit.record(admin.id, 'payout.paid', id, '<amount> INR')
```

Also add `payouts: { pending, paid }` totals to `GET /admin/stats`.
`admin.controller.spec.ts` builds `AdminController` by hand, so when the
controller gets a new dependency (the payouts service), update the setup
there too.

### Screens

- **Web:** `apps/web/src/pages/AdminPayouts.tsx`, a table like
  `AdminPayments.tsx` with a status filter and a "Mark paid" button. Add the
  route in `App.tsx`, a nav link in `components/Layout.tsx`, and types plus
  calls in `api.ts`.
- **Mobile (stretch):** on `EarningsScreen.tsx`, show "Paid out" next to jobs
  whose payout is `paid`.

### Seed

Add a `seedPayouts()` in `prisma/seed.ts` so the admin page is not empty:
two `pending`, one `paid`.

## Tests (aim for 12 or more)

- Fake gateway: succeeds; fails for `amount % 100 === 13`; reference is stable.
- `confirm`: success stores the reference and creates a payout; gateway
  failure sets `failed` and creates **no** payout; confirming twice creates one
  payout; a payment with no request creates none.
- Refund: cancels a pending payout; refuses when the payout is `paid`.
- Payouts: mark paid sets `paidAt`; paying twice is harmless; paying a
  cancelled payout is a 400; provider sees only their own payouts.
- Controller: non-admin gets 403 on the admin routes (copy the pattern in
  `admin.controller.spec.ts`).

Follow `payments.service.spec.ts`: a `setup()` that builds a fake `prisma`
with `jest.fn()`s, then one `it` per rule.

## Commit plan

1. `Payments: add the gateway interface and a fake sandbox gateway`
2. `Payments: confirm goes through the gateway and can fail`
3. `Payouts: add the Payout table and a migration`
4. `Payouts: create a payout when a payment succeeds; refund cancels it`
5. `Payouts: provider can list their payouts`
6. `Payouts: admin can list payouts and mark one paid`
7. `Payouts: admin page in the web console`
8. `Payouts: sample payouts in the seed`

## Minimum / stretch

- **Minimum (must finish):** commits 1 to 4 with tests, plus the admin
  `GET /admin/payouts` and `POST .../pay`.
- **Stretch:** web page, provider payouts route, mobile earnings label.

## Done when

- [ ] `npm test` green, including your new tests.
- [ ] Customer pays a job: payment `succeeded`, payout appears as `pending`
      for the provider.
- [ ] Admin marks it paid: status `paid`, an `payout.paid` row in the audit log.
- [ ] Paying an amount ending in 13 paise shows a failed payment.
- [ ] You can explain, without notes: why the gateway is an interface, why
      payouts are created on success and not on completion, and what happens
      on a refund.

## Demo line

"The platform now charges through a gateway interface, a sandbox for the
demo; a real gateway only needs another class behind the same interface. When
a payment succeeds the provider's share becomes a payout that the admin marks
paid, and the audit log records who did it."
