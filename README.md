# MOTIQ — Roadside Assistance Platform

A roadside-assistance marketplace. A driver in trouble asks for help in the
app; the nearest approved service provider who is online and free is offered
the job, does the work, and gets paid. The platform keeps a commission.
Operators approve providers and watch everything from a web console.

## Team

| Name | Roll no. | GitHub | Owns |
|------|----------|--------|------|
| Shankararam S U | 2024115020 | @Shankar-147 | Auth, requests and matching |
| Viswa C | 2024115128 | @VISWA0006 | Payments, fare and commission |
| SelvaPriya S | 2024115046 | @2024115046 | Providers and approval, admin |

## What is built

- **Customers** (mobile): sign in with a phone number, ask for help, follow the
  request, pay.
- **Providers** (mobile): sign up, upload documents, go online in an area,
  accept or decline offers, move a job through its steps, see earnings.
- **Matching:** the nearest approved, online, free provider is offered the job;
  if they decline it goes to the next one.
- **Money:** fare from the problem plus distance, commission split on every bill.
- **Admin** (web): approve providers, see requests, users and payments, refund,
  audit log, dashboard.

Not built yet: ratings, SOS, live GPS tracking, push notifications, a real
payment gateway and SMS provider.

## Running it

Needs Node 20+ and a running PostgreSQL.

```
# API
cd apps/api
npm install
copy .env.example .env        # then set DATABASE_URL and JWT_SECRET
npx prisma migrate deploy
npm run seed                  # demo admin, customers, providers and jobs
npm run start:dev             # http://localhost:3001/api/v1

# Web console (second terminal)
cd apps/web
npm install
npm run dev                   # http://localhost:5173

# Mobile app in a browser (third terminal)
cd apps/mobile
npm install
npx expo start --web --port 8081   # http://localhost:8081
```

There is no SMS provider yet, so the one-time code is printed in the API
terminal. Demo numbers: admin `99999 00000`, providers `98460 00001` and
`98460 00002` (approved) and `98460 00003` (waiting for approval), customer
`98450 00011`. Any new 10 digit number signs up as a customer or provider.

Tests: `cd apps/api && npx jest`.

## Tech stack

- **API:** NestJS, TypeScript, Prisma, PostgreSQL, JWT, Jest
- **Web console:** React, Vite, TypeScript
- **Mobile app:** React Native (Expo), TypeScript
