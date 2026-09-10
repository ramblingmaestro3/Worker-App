---
name: deploy-preflight
description: Pre-deploy checklist for the AZA platform. Verifies pending Flyway migrations, required env vars, GHCR image builds, and zero-downtime rollout readiness before shipping backend or web apps to the droplet. Use before any production deploy, when asked "is this safe to deploy", or after merging a batch of changes destined for prod.
---

# Deploy Preflight

Run every check below against the current branch vs. what's in production. Output a single PASS/FAIL table at the end with one row per check; any FAIL blocks the deploy until resolved or explicitly waived by the user.

## Architecture facts (do not rediscover these)

- CI builds Docker images and pushes to **GHCR (`ghcr.io/az-spaces`)**. The server only pulls — never build on the droplet.
- Zero-downtime rollout uses **docker-rollout** + container healthchecks + nginx reload. A deploy without a passing healthcheck will not cut over.
- The backend schema is **Flyway-owned** (`baseline-version=32`, `ddl-auto=validate`). Any entity change without a matching migration fails boot in prod with a validate error.
- `SWAGGER_ENABLED` is hardcoded in the compose file; springdoc must stay on 3.0.x for Boot 4.

## Checks

### 1. Migrations
- List migrations in `backend/src/main/resources/db/migration/` newer than the last deployed version (ask the user for the prod version if unknown, or check `flyway_schema_history` if DB access exists).
- For each new migration: is it backward-compatible with the *currently running* backend (old code must survive against the new schema during rollout)? Column drops, renames, and NOT NULL additions without defaults are FAIL.
- Confirm no entity/field changed without a matching `V<N>__*.sql` — grep the diff for `@Entity`, `@Column`, new fields on entities.

### 2. Environment variables
- Diff for newly introduced config: grep the changes for `${` in `application*.yml`, `System.getenv`, `process.env`, and new keys in compose files.
- Every new variable must exist in the prod compose/env. Known past miss: `PAYMENT_PROOF_HMAC_SECRET`. Flag any new secret that has no prod value confirmed.

### 3. Images
- Confirm the CI workflow that builds/pushes images is green for the deploy commit: `gh run list --branch <branch> --limit 5`, then `gh run view <id>` if unclear.
- Confirm every changed app (backend, aza-web, aza-admin, aza-merchants, aza-pay, aza-superagents) has an image tag for the deploy SHA in GHCR.

### 4. Rollout safety
- Backend changes: is the healthcheck endpoint unaffected? Does the change tolerate two versions running side-by-side for the rollout window (queue/WebSocket/Redis message format changes are the usual break)?
- nginx config changed? A reload is needed and must be listed in the deploy steps.

### 5. Money & auth blast radius
- If the diff touches transfer/wallet/payout/auth code, require that `money-path-review` (and tests) ran on it first. A money-path diff with no review is FAIL.

## Output

A table: `| Check | Status | Detail |`, then a short "deploy steps" list in order (pull, rollout per service, nginx reload if needed, post-deploy verification: hit the status page and one authenticated endpoint). If everything passes, say so plainly and give the exact commands.
