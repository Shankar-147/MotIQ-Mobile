# MOTIQ admin console

Next.js + Tailwind web app for support/ops staff. Talks to the API in `apps/api`.

## Pages

- **Login** - phone number + OTP. Only accounts with the admin role get in.
- **Overview** - user and payment totals, latest payments.
- **Users** - search, filter by status, suspend / reactivate.
- **Payments** - search by phone, filter by status, running total.

## Running it

You need Postgres running and `apps/api/.env` filled in (see `.env.example`).

```
# terminal 1 - API
cd apps/api
npm install
npx prisma migrate deploy
npm run seed          # demo admin + sample users and payments
npm run start:dev

# terminal 2 - admin console
cd apps/admin
npm install
npm run dev           # http://localhost:3000
```

Log in as the seeded admin, `99999 00000`. There is no SMS provider yet, so
the 6-digit code is printed in the API terminal (`[dev] OTP for ...`).

To make a real number an admin, add it to `ADMIN_PHONES` in `apps/api/.env`
(comma separated) and restart the API.
