# Shankararam: Ratings and provider location

Module: **Auth + Requests and Matching** (you already own it).
Branch: `feature/ratings`. PR reviewed by: SelvaPriya.

## Before you start (tonight)

- [ ] Open a PR `feature/roadside` -> `main` and merge it, so everyone
      branches from `main`.
- [ ] Settings -> Collaborators on `Shankar-147/MotIQ-Mobile`: confirm Viswa
      and SelvaPriya can push.
- [ ] Send the three cards plus `00-start-here.md` to the group.
- [ ] Tell SelvaPriya her notifications work will touch `RequestsService`
      and `MatchingService` (see her card, "Touching Shankararam's code").

## What and why

Two "not done" features in your area:

1. **Ratings.** After a completed job the customer rates the provider 1 to 5.
   The provider's average is shown to the admin and to the provider.
2. **Provider location.** The provider app sends a location while on a job,
   and the customer sees roughly how far away the provider is. This is
   **polled**, not a live map; say that.

## Design

### Ratings

```prisma
model Rating {
  id         String          @id @default(uuid())
  requestId  String          @unique
  request    ServiceRequest  @relation(fields: [requestId], references: [id])
  customerId String
  providerId String
  provider   ProviderProfile @relation(fields: [providerId], references: [id])
  stars      Int
  comment    String?
  createdAt  DateTime        @default(now())

  @@index([providerId])
}
```

Add `rating Rating?` on `ServiceRequest` and `ratings Rating[]` on
`ProviderProfile`.

Rules for `rate(customer, requestId, dto)`:

- Request exists (404); belongs to this customer (403).
- Status is `completed` (400 otherwise): you cannot rate a job in progress.
- Not already rated (400 or 409, pick one and be consistent).
- `stars` is an integer 1 to 5 and `comment` at most 280 characters
  (`@IsInt @Min(1) @Max(5)`, `@MaxLength`).

Routes and where they live:

```
POST /requests/:id/rating     in requests.controller.ts   body { stars, comment? }
```

Average per provider: compute with `prisma.rating.aggregate({ _avg, _count })`
rather than storing it, so it can never be out of date. Return
`rating: { average, count }` from the provider's own profile
(`providers.service.ts`) and in the admin provider list/detail
(`listForAdmin`, `getForAdmin`). `GET /requests/:id` should include the
rating so the customer screen can show "You rated 4".

### Provider location

`ProviderProfile` already has `latitude` and `longitude` (set from the area
when going online, and used by matching). Add `lastLocationAt DateTime?`.

```
PATCH /providers/me/location      ProviderGuard    body { latitude, longitude }
```

- Validate with `@IsLatitude()` and `@IsLongitude()` (class-validator).
- Only an **approved** provider; a pending one gets 403. `ProviderGuard`
  only checks the role, so the approval check goes in the service, the same
  way `setPresence` does it in `providers.service.ts`.
- Sets `latitude`, `longitude`, `lastLocationAt = now`.

In `RequestsService.findOneFor`, when the request is active
(`accepted`, `en_route`, `arrived`, `in_progress`) and the provider has a
location, add `providerDistanceKm` (rounded to 1 decimal) using
`distanceKm` from `common/geo.ts`. Outside active jobs return nothing, so a
customer can never read a provider's location after the job.

### Screens

- **Mobile customer:** on `RequestDetailScreen.tsx`
  - after `completed`: five tappable stars and a Submit button, then "You
    rated 4";
  - while active: "Provider is about 2.4 km away" (the screen already polls
    with `usePolling`).
- **Mobile provider:** on `JobsScreen.tsx` during an active job, an
  "Update my location" button that calls `navigator.geolocation` where it
  exists (works in the browser build) and sends the result. Stretch: repeat
  every 20 seconds.
- **Web admin:** show the provider's average in `AdminProviders.tsx`.

### Seed

Add `seedRatings()`: ratings on the completed demo jobs, so averages are not
empty.

## Tests (aim for 12 or more)

- Rating: customer can rate a completed job; 403 for another customer; 400 on
  a job in progress; second rating refused; stars 0 and 6 rejected by the DTO;
  unknown request 404.
- Average: two ratings of 5 and 4 give 4.5 with count 2; no ratings gives
  `{ average: null, count: 0 }`.
- Location: valid coordinates update the profile and `lastLocationAt`;
  latitude 91 rejected; pending provider 403.
- Distance: present for an active job and correct for a known pair of points
  (reuse the numbers in `geo.spec.ts`); absent for a completed job.

## Commit plan

1. `Ratings: add the Rating table and a migration`
2. `Ratings: customer can rate a completed job`
3. `Ratings: show the provider's average to the provider and the admin`
4. `Location: provider can update their location`
5. `Location: customer sees how far the provider is during a job`
6. `Ratings: stars on the request screen in the mobile app`
7. `Location: provider sends their location from the jobs screen`
8. `Ratings: sample ratings in the seed`

## Minimum / stretch

- **Minimum:** commits 1 to 3 with tests (ratings, API plus average).
- **Stretch:** location (4, 5, 7), mobile stars.

## Also on your list (not code)

- Review Viswa's PR (payouts) properly: run it, try the failing amount,
  leave at least one specific comment.
- Friday morning: merge order is Viswa, SelvaPriya, you, because yours
  touches `RequestsService` and is easiest to rebase last.
- After merge, re-count the 30-feature list and update the contribution sheet
  to match what the history actually shows.

## Done when

- [ ] `npm test` green, including your new tests.
- [ ] Complete a job in the demo, rate it 5, see the average on the provider
      and in the admin list.
- [ ] A second rating on the same job is refused.
- [ ] You can explain, without notes: why the average is computed and not
      stored, why location is only returned for an active job, and what
      "polled, not live" means.

## Demo line

"After a job the customer rates the provider, and the average is calculated
from the ratings, never stored. While a job is active the customer sees how
far away the provider is, and that disappears when the job ends."
