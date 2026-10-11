# MOTIQ — Mobile Roadside Assistance Platform

An AI-assisted roadside-assistance marketplace connecting drivers to verified
service providers, built as a team project.

## Team

| Name | Roll no. | GitHub | Module |
|------|----------|--------|--------|
| Shankararam S U | 2024115020 | @Shankar-147 | Auth, database, project setup, web app |
| Viswa C | 2024115128 | @VISWA0006 | Payments |
| SelvaPriya S | 2024115046 | @2024115046 | Admin console |

## Modules

See [MODULES.md](MODULES.md) for how the project is split across the team and
current status of each module.

## What works today

- **Auth** — phone number and one-time code login, JWT, guards.
- **Payments** — create, confirm and refund payments for the logged in user.
- **Admin** — search and suspend users, list and refund payments, audit log, dashboard.
- **Web app** — sign in, my payments, profile, and the admin screens.
- **Mobile app** — sign in and payments on a phone (Expo).

Not built yet: service requests and provider matching.

## Running it

Needs Node 20+ and a running PostgreSQL.

```
# API
cd apps/api
npm install
copy .env.example .env        # then set DATABASE_URL and JWT_SECRET
npx prisma migrate deploy
npm run seed                  # demo admin, 5 users, 10 payments
npm run start:dev             # http://localhost:3001/api/v1

# Web app (second terminal)
cd apps/web
npm install
npm run dev                   # http://localhost:5173
```

Sign in as the demo admin with `99999 00000`. There is no SMS provider yet,
so the one-time code is printed in the API terminal.

Mobile app (third terminal, optional):

```
cd apps/mobile
npm install
npx expo start --web --port 8081   # or press a for an Android emulator
```

Tests: `cd apps/api && npx jest`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the git workflow, and
[GIT_GUIDE.md](GIT_GUIDE.md) if you're new to git.

## Tech stack

- **API:** NestJS, TypeScript, Prisma, PostgreSQL, JWT, Jest
- **Web app:** React, Vite, TypeScript
- **Mobile app:** React Native (Expo), TypeScript
