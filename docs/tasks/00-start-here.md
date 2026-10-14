# Start here (everyone)

Deadline: **Friday 16 October**, morning merge, afternoon rehearsal.
Each person has one card: `01-shankararam.md`, `02-viswa.md`, `03-selvapriya.md`.

## Ground rules

1. **Commit from your own account.** The history is what faculty read.
   Nobody commits for anyone else, and nobody changes the author on a commit.
2. **Write it so you can explain it.** Every file you add, you should be able
   to describe line by line in the viva. If you use an AI helper, read what it
   gave you, run it, and change it until it is yours.
3. **Small commits.** One logical step each: a schema change, a service, a
   controller, its tests, a screen. Six to eight commits per person is the aim.
   Never one big commit at the end.
4. **Tests before every commit.** `npm test` in `apps/api` must be green.

## One-time setup (Wednesday night)

```
git clone https://github.com/Shankar-147/MotIQ-Mobile.git
cd MotIQ-Mobile
git config user.name  "<your GitHub username>"
git config user.email "<the email on your GitHub account>"
```

Then copy `apps/api/.env.example` to `apps/api/.env`, put your own Postgres
password in `DATABASE_URL`, and double-click `run-demo.bat`. Sign in as the
admin (`99999 00000`) and click around so you know what exists.

Check your identity worked: make a tiny commit (fix a typo in a comment),
run `git log -1`, and confirm it shows **your** name. Then push and check it
shows on your GitHub profile. If it does not, the email is wrong; fix that
before doing real work.

## Branches and pull requests

- Branch from `main` once `feature/roadside` is merged (Shankararam does this
  tonight). Name it after your piece: `feature/payouts`, `feature/sos`,
  `feature/ratings`.
- Push the branch and open a PR into `main`. The PR must be reviewed by
  someone else:

  | Your PR | Reviewed by |
  |---|---|
  | Shankararam | SelvaPriya |
  | Viswa | Shankararam |
  | SelvaPriya | Viswa |

- A review comment is real evidence of teamwork. Leave at least one that asks
  or suggests something specific.

## Commit message style

Same as the existing history: area, colon, what it does, in plain words.

```
Payouts: add the Payout table and a migration
Payouts: create a payout when a payment succeeds
Payouts: admin can list payouts and mark one paid
```

## Database changes (important, three people are doing this)

All three cards add tables, and all three edit `apps/api/prisma/schema.prisma`.
To avoid painful merges:

- Add your models in **your own block** at the end of the file, under a
  comment such as `// ---- payouts ----`. Do not reorder existing models.
- Change an existing model only by adding a field (Viswa: `Payment`;
  Shankararam: `ProviderProfile`). Say so in the PR.
- Create the migration with `npx prisma migrate dev --name <short_name>`.
- **Before opening the PR:** `git fetch && git rebase origin/main`, then run
  `npx prisma migrate dev` again. If the schema file conflicts, keep both
  blocks.
- The seed (`prisma/seed.ts`) is shared: add your sample rows in a clearly
  named function and call it from the end of `main()`.

## Where to look for patterns

Copy the shape of something that already exists, then change it.

| You are adding | Look at |
|---|---|
| A service with Prisma calls and a spec | `src/payments/payments.service.ts` and `.spec.ts` |
| A controller with guards | `src/payments/payments.controller.ts` |
| A provider-only route | `src/payments/earnings.controller.ts` |
| An admin route plus an audit entry | `POST admin/payments/:id/refund` in `src/admin/admin.controller.ts` |
| A paged admin list | `listAll` in `src/payments/payments.service.ts` |
| A web admin page | `apps/web/src/pages/AdminPayments.tsx` |
| A mobile button that calls the API | `apps/mobile/src/screens/customer/RequestDetailScreen.tsx` |

## Friday

| When | What |
|---|---|
| Morning | Last pushes by 10:00. Reviews and merges by 11:00. |
| Midday | Everyone pulls `main`; run the tests and `run-demo.bat` from clean. No new code after this. |
| Afternoon | Rehearse the demo; each person narrates their own part and shows their commits. |

If a piece is running late, **cut scope, do not skip tests**. Each card has a
"minimum" and a "stretch" for that reason.
