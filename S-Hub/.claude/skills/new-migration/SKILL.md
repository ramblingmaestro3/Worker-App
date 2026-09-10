---
name: new-migration
description: Creates a new Flyway migration for the AZA backend with the correct next version number, naming convention, and rollout-safety checks. Use when adding/altering tables or columns, when an entity change needs a schema change, or when the user says "add a migration".
---

# New Migration

Flyway owns the schema (`ddl-auto=validate`, `baseline-version=32`). Every entity change ships with a migration or prod boot fails validation.

## Steps

1. **Next version number** — never guess:
   ```bash
   ls backend/src/main/resources/db/migration | sort -t V -k2 -n | tail -3
   ```
   Take the highest `V<N>` and increment. Sub-versions like `V25.5` exist (the ddl-auto backfill); plain integers for new work.

2. **Name**: `V<N>__snake_case_description.sql` — double underscore, lowercase, says what it does (`V42__merchant_settlement_schedule.sql`), placed in `backend/src/main/resources/db/migration/`.

3. **Write rollout-safe SQL.** During a zero-downtime deploy the *old* backend runs against the *new* schema for a window, so:
   - Additive changes only in one release: new columns are nullable or have defaults; never drop/rename a column the running code still reads (do it one release later).
   - Use `IF NOT EXISTS` / `IF EXISTS` guards where Postgres supports them.
   - Index creation on large tables: `CREATE INDEX CONCURRENTLY` (and note it can't run inside a transaction — Flyway needs `-- flyway:executeInTransaction=false` as the first line).

4. **Match the entity.** Update the JPA entity in the same change; column names, types, and nullability must agree with the SQL exactly — `validate` will catch drift at boot, but catch it yourself first.

5. **Verify both boot paths** (this repo has burned on each):
   - **Fresh schema**: boot against a clean Postgres (docker) and confirm all migrations apply in order.
   - **Local dev caveat**: the local `aza_db` is half-migrated and boots with Flyway disabled + `ddl-auto=update` — a migration that "works locally" that way has proven nothing. Use the clean-docker boot as the real test.

6. **Never edit an applied migration.** Checksum mismatch breaks every environment that already ran it. Fix-forward with a new version.

## Output

Report the new version number, file path, what it changes, and the verification result (clean boot applied V<N> successfully).
