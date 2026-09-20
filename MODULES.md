# Module ownership

Each module is owned by one teammate. Own your module: design it, build it,
commit it under your own GitHub account, on your own branch, merged via a
pull request that at least one other teammate reviews.

Work on your own branch (`<yourname>/<module>`), open a PR into `main` when a
module (or a meaningful slice of it) is working, and merge after review.
Don't commit directly to `main`.

| # | Module | Branch prefix | Owner | Status |
|---|--------|---------------|-------|--------|
| 1 | **Auth** — OTP request/verify, JWT issuance, session handling | `auth/` | Shankararam | 🚧 in progress |
| 2 | **Service requests** — request creation, status state machine, request history | `requests/` | _unassigned_ | ⬜ not started |
| 3 | **Matching & providers** — provider profiles, verification status, nearest-provider matching | `matching/` | _unassigned_ | ⬜ not started |
| 4 | **Payments** — commission calculation, payment split, payout tracking | `payments/` | _unassigned_ | ⬜ not started |
| 5 | **Mobile app** — Customer/Provider screens, navigation, UI components | `mobile/` | _unassigned_ | ⬜ not started |
| 6 | **Admin console** — internal ops/support web app | `admin/` | _unassigned_ | ⬜ not started |

## How to claim a module

1. Pick an unassigned module above.
2. Edit this file, put your name in the Owner column, open a tiny PR just for
   that change (this is also good practice for your first PR).
3. Create your branch: `git checkout -b <module>/<short-task>` (e.g.
   `matching/provider-search`).
4. Build it in small, real commits as you go — not one giant commit at the
   end. Commit whenever something works: a model, an endpoint, a test.
5. Push your branch and open a PR into `main` when ready for review.

## Why small modules, real commits

The point of this structure is that GitHub history should reflect who built
what, and when. Commit early and often — after each small working piece, not
just once at the end. That's what makes the history meaningful, both for
grading and for you actually being able to explain your own code later.
