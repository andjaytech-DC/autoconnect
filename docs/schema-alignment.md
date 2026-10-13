# Prisma schema alignment

## The problem

The Next.js frontend and the NestJS backend both pointed at the same
PostgreSQL database:

```
postgresql://postgres:password@localhost:5432/progressive_autohub
```

but each carried its **own** `schema.prisma`. The database had been migrated
by the backend, so the backend's 39 models matched reality. The frontend's
schema declared 23 models, four of which had **no table at all**, and it
described columns that had never existed.

Because Prisma validates against the schema file rather than the live
database, the drift stayed invisible at compile time and only surfaced as
HTTP 500s at runtime:

| Route | Cause |
| --- | --- |
| `/api/dealer/register` | `Dealer.email`, `Dealer.ownerName`, `Dealer.approvedAt` — none exist |
| `/api/insurance` | `InsuranceEnquiry.existingExpiry` — does not exist |
| `/api/finance-applications` | `FinanceApplication.applicantName/phone/email/employmentType` — none exist |
| `/api/inspections` | relations on columns the backend never created |
| `/api/marketplace` | `MarketplaceProduct.category/brand/priceMrp/priceSale` — do not exist |
| `/api/services/bookings` | `include: { provider }` — `ServiceBooking` has only a `providerId` scalar |

Four models were pure fiction: `VehicleFeature`, `VehicleSpecification`,
`NotificationDelivery`, `NotificationDeliveryAttempt`.

## The fix

`prisma/schema.prisma` in the frontend is now generated from the backend's
schema. The backend is the only schema that owns migrations, so it is the
single source of truth:

```
progressive-autohub-backend/prisma/schema.prisma   <- owns the migrations
                 |
                 | mirrored into
                 v
autoconnect/prisma/schema.prisma                   <- local generator only
```

The frontend copy keeps its own generator block, because it uses the `pg`
driver adapter and emits into `app/generated/prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

The models and enums below that header are a verbatim copy. **If you change
one, change the other.** Re-copy with:

```powershell
# from C:\Users\bobby\autoconnect
Copy-Item C:\Users\bobby\progressive-autohub-backend\prisma\schema.prisma .\prisma\schema.prisma.bak
# then re-apply the generator + datasource header and strip backend's own header
npx prisma generate
```

## What changed in application code

Columns the frontend invented no longer have a home, so the code was changed
to use what actually exists rather than to re-create the missing columns.

### `app/server/notifications.ts` — rewritten

The old module implemented multi-channel delivery tracking: a logical
notification, a per-channel state machine, and an immutable attempt log. Two
of those three tables do not exist.

The real `Notification` row is small — `userId`, `title`, `body`, `type`,
`data`, `isRead`. The module now does only the three things its single caller
(`app/api/notifications`) needs: list, mark one read, mark all read. It
reports a synthetic `IN_APP`/`DELIVERED` row so the UI contract is unchanged.

### `app/server/authz.ts` — dealer lookup

Dealers are linked to accounts by `Dealer.userId`, not by a dealer email
column. The lookup was `where: { email: session.email }`, which could never
match. It now parses the integer session id.

### `app/server/audit.ts` — column shapes

`AuditLog` has `userId Int` (required), `entityId String` (required), and
`metadata String?` (text, not JSON). The helper was writing a JSON object to
`metadata`, allowing a null `userId`, and sending an `ipAddress` column that
does not exist. Fixed, plus a skip when a caller supplies neither a user id
nor an entity id, since such a row is unrecordable.

### `app/api/telemetry/error/route.ts` — no longer writes to AuditLog

The client-error beacon is unauthenticated and `AuditLog.userId` is
non-null. Writing a row would have meant inventing a user id. Occurrences are
counted in memory and logged to the server console instead.

### `app/api/finance-applications/route.ts` — applicant identity

`FinanceApplication` identifies its applicant through `userId`. The table has
no name, phone, email or employment columns. A signed-in applicant is now
linked automatically; the form still accepts and validates those fields so
existing forms keep working, but for a guest they are **not persisted**.

If applicant contact details must be retained for guest applications, the
table needs new columns — and those columns belong in the backend schema with
a migration, not just in the frontend copy.

### `app/api/vehicles/*` — image relation

The relation is `vehicleImages` (`VehicleImage[]`), not `gallery`. There is no
`viewCount` column, so the increment on detail views was dropped. `features`
is a `String[]` column, not a relation, so it is no longer mapped as objects.

The vehicle-detail response was also narrowed to the fields the UI actually
reads. `ownership`, `seatingCapacity` and `specification` were never columns;
they are gone rather than faked. `app/lib/nest-mappers.ts` already produced
this same shape from the backend, so both paths now agree.

### `app/api/dealer/register/route.ts`

- No `email` column, so duplicate detection is by `phone`. Contact details
  live on the linked `User` account.
- No `approvedAt`; approval sets `isVerified` + `status`, and the decision
  time is the `AuditLog` entry.
- The GET select returns real columns only.

### `app/api/admin/lookups/route.ts`

`Dealer` has no `isActive` flag — `status` carries the lifecycle. Dealers that
are not `REJECTED` are listed.

### `app/api/services/bookings/[id]/route.ts`

`ServiceBooking` has only `providerId`, with no Prisma relation to
`ServiceProvider`. The provider is fetched with a second query.

### `prisma/seed.ts` — deleted

Unreferenced by any script (`package.json` points at `prisma/seed-all.ts`) and
written against the old fiction: a string admin id, `username`/`name`/
`passwordHash` columns, and `Dealer.email`. It could never have run.

`prisma/seed-all.ts` is the live seed and is unaffected. Note that the backend
already seeds brands, categories, dealers, users and new cars — the two seeds
must not both write the same rows.

## Data honesty

Several fields the UI showed were never persisted. They are now omitted rather
than faked, so the UI will render them empty:

- vehicle `ownership`, `seatingCapacity`, `specification`
- `?seats=` filter on `/api/vehicles` (no column; nothing in the UI sends it)
- guest finance applicant name/phone/email

## Verification

```
npx tsc --noEmit          0 errors   (was 84)
npx next build            compiled, 78/78 static pages
```

All 17 Prisma-backed API routes return 200 when authenticated, including the
six that were returning 500.

**Note:** `next dev` writes generated types to `.next/dev/types/`. Run
`Remove-Item .next -Recurse -Force` before `next build`, or the build fails on
a stale `routes.d.ts`.
