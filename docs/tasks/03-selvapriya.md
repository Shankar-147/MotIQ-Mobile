# SelvaPriya: SOS alerts and notifications

Module: **Providers and Approval + Admin console** (you already own it).
Branch: `feature/sos`. PR reviewed by: Viswa.

## What and why

Two "not done" features that sit naturally in your area:

1. **SOS.** During an active job, the customer (or the assigned provider) can
   raise an SOS. The admin sees open alerts in the console and resolves them.
2. **Notifications.** Job events create in-app notifications, so people see
   "Your provider is on the way" without opening the request.

Be exact about scope in the viva: these are **in-app** notifications read by
polling, **not** push notifications to a phone.

## Design

### SOS

Schema (own block at the end of `schema.prisma`):

```prisma
enum SosStatus { open resolved }

model SosAlert {
  id           String         @id @default(uuid())
  requestId    String
  request      ServiceRequest @relation(fields: [requestId], references: [id])
  raisedById   String
  note         String?
  status       SosStatus      @default(open)
  createdAt    DateTime       @default(now())
  resolvedAt   DateTime?
  resolvedById String?

  @@index([status])
  @@index([requestId])
}
```

Add `sosAlerts SosAlert[]` on `ServiceRequest`.

New module `apps/api/src/sos/`:

```
sos.module.ts   sos.service.ts   sos.controller.ts   dto/raise-sos.dto.ts   sos.service.spec.ts
```

Rules for `raise(user, requestId, note?)`:

- The request must exist (404 otherwise).
- The user must be that request's customer **or** its assigned provider's
  user (403 otherwise). Copy the check from `findOneFor` in
  `requests.service.ts`.
- The request must be active: `accepted`, `en_route`, `arrived` or
  `in_progress` (400 otherwise).
- If an `open` alert already exists for the request, return it instead of
  creating a second one.
- Note is optional and at most 280 characters (use `@MaxLength`).

Routes:

```
POST /requests/:id/sos                  JwtAuthGuard           -> raise
GET  /admin/sos?status=&page=&pageSize= AdminGuard             -> list, newest first
POST /admin/sos/:id/resolve             AdminGuard             -> resolve + audit 'sos.resolved'
```

Resolving an already-resolved alert is harmless. Add the `sos` routes to the
admin controller the way `reviewProvider` records its audit entry.

Also add `sos: { open: n }` to `GET /admin/stats`.
`admin.controller.spec.ts` builds `AdminController` by hand, so when the
controller gets a new dependency (the SOS service), update the setup there
too. Viswa edits the same constructor for payouts, so whoever merges second
resolves that conflict; keep both arguments.

### Notifications

```prisma
model Notification {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  title     String
  body      String
  requestId String?
  readAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId, createdAt])
}
```

Add `notifications Notification[]` on `User`.

New module `apps/api/src/notifications/`:

- `NotificationsService.notify(userId, title, body, requestId?)`
- `GET /notifications` -> `{ items: last 30, unread: n }` for the logged-in user
- `POST /notifications/:id/read` (only your own; someone else's is 403)

Events that create a notification:

| Event | Who is told | Text (example) |
|---|---|---|
| Provider accepts | customer | "A provider accepted your request" |
| Status becomes en_route / arrived / completed | customer | "Your provider is on the way" etc. |
| A request is offered to a provider | that provider | "New job offer nearby" |
| SOS raised | the other party on the job | "An SOS was raised on this job" |

**Touching Shankararam's code:** the first three hooks live in
`RequestsService` and `MatchingService`, which adds a constructor
argument and changes `setup()` in their specs. Do this as **its own, last
commit**, tell Shankararam beforehand, and rebase on `main` just before you
open the PR. SOS and the notifications module itself do not need it.

### Screens

- **Web:** `apps/web/src/pages/AdminSos.tsx`, a table with a status filter and
  a "Resolve" button (model it on `AdminPayments.tsx`). Route `/admin/sos` in
  `App.tsx`, nav link "SOS" in `components/Layout.tsx`, types and calls in
  `api.ts`. Show the open count on `AdminDashboard.tsx`.
- **Mobile:** an "SOS" button on `customer/RequestDetailScreen.tsx` while the
  job is active (look at how the Cancel button calls `api.cancelRequest`), and
  a small notifications list. Minimum is the customer button; the provider
  button on `JobsScreen.tsx` is stretch.

### Seed

`seedSos()` in `prisma/seed.ts`: one open alert on an active request, one
resolved.

## Tests (aim for 12 or more)

- SOS raise: customer can; assigned provider can; a stranger gets 403; a
  `completed` or `requested` request is a 400; a second raise returns the
  same open alert; unknown request is 404; long note rejected by the DTO.
- SOS resolve: sets `status`, `resolvedAt`, `resolvedById`; resolving twice is
  harmless; non-admin gets 403.
- Notifications: `notify` writes a row; list returns newest first with the
  unread count; marking someone else's notification is 403; marking twice
  keeps the first `readAt`.
- Hook: accepting an offer notifies the customer (once the hook is in).

## Commit plan

1. `SOS: add the SosAlert table and a migration`
2. `SOS: customer or assigned provider can raise an alert on an active job`
3. `SOS: admin can list and resolve alerts, with an audit entry`
4. `SOS: admin page and dashboard count in the web console`
5. `Notifications: add the table and a service to list and mark read`
6. `Notifications: tell the customer when the job moves on`
7. `SOS: button on the request screen in the mobile app`
8. `SOS and notifications: sample rows in the seed`

## Minimum / stretch

- **Minimum:** commits 1 to 4 with tests (SOS end to end, API plus admin page).
- **Stretch:** notifications (5 and 6), mobile button, seed.

## Done when

- [ ] `npm test` green, including your new tests.
- [ ] Customer raises SOS on an active job; admin sees it as open and
      resolves it; the audit log shows `sos.resolved`.
- [ ] A second raise does not create a duplicate.
- [ ] You can explain, without notes: who is allowed to raise an SOS and why,
      why it is refused on a completed job, and why the audit entry is
      written by the controller.

## Demo line

"While a job is active, either side can raise an SOS. It goes straight to the
admin console as an open alert, the admin resolves it, and the action is
recorded in the audit log."
