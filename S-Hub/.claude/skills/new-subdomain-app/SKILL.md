---
name: new-subdomain-app
description: Scaffolds a new AZA Next.js subdomain app (like aza-admin, aza-merchants, aza-superagents) with the platform's full hardening and deployment checklist applied from day one — security headers, CORS, internal-secret proxy, port, nginx, compose, CI, GHCR. Use when adding a new web app/portal/subdomain to the monorepo.
---

# New Subdomain App

Every AZA web app has been hardened *after* the fact by an audit (headers, CORS, secrets). This skill front-loads that. Use the newest existing app (`aza-superagents`) as the structural template — copy its config, not aza-web's.

## Registry (update this table in this file when the app ships)

| App | Subdomain | Port |
|---|---|---|
| aza-web | aza.systems | 3000 |
| aza-admin | admin.aza.systems | 3001 |
| aza-merchants | merchants.aza.systems | 3002 |
| aza-superagents | superagents.aza.systems | 3003 |

Next app takes the next port. Confirm the intended subdomain with the user before wiring.

## Checklist — all of it, in order

1. **Scaffold** `aza-<name>/` at repo root, copying from `aza-superagents`: Next.js config, tsconfig, lint setup, Tailwind, Dockerfile.
2. **Security headers** in `next.config` from day one: CSP, `X-Frame-Options`/frame-ancestors, `X-Content-Type-Options`, `Referrer-Policy`, HSTS (mirror aza-superagents — those were fixed in the June 2026 audit).
3. **Backend calls go through server-only proxy routes**, never from the browser to the API directly. Internal/privileged endpoints authenticate with the `X-Internal-Secret` shared-secret header, kept server-side only (the waitlist proxy is the reference pattern).
4. **Auth token storage**: do NOT put JWTs in localStorage — that's a standing HIGH finding against aza-admin/aza-merchants. Use httpOnly cookies via the proxy layer for the new app.
5. **CORS**: add the new origin explicitly to the backend CORS config; the default must stay deny (the permissive default was a past finding — don't reintroduce it).
6. **Backend routes**: if the app gets its own API surface, follow the existing prefix convention (`/api/v1/admin/**`, `/api/v1/superagent/**` → `/api/v1/<role>/**`) with role-based authorization on the whole prefix.
7. **Deploy wiring**: compose service (image `ghcr.io/az-spaces/aza-<name>`), healthcheck, docker-rollout compatibility; nginx server block for the subdomain + reload step; CI workflow entry that builds/pushes the image (a new app not in the workflow silently never deploys).
8. **Lockfile**: after `npm install` on macOS, verify the lockfile contains the Linux native blocks (Tailwind oxide et al.) or CI will fail — see `ci-doctor` trap #1.
9. **DNS + TLS** for the subdomain (flag for the user — usually manual in Cloudflare; remember the Vercel/Cloudflare geoblock incident: any server-side fetch from a new egress needs allowlisting).
10. **Passcode/2FA conventions** if the app has auth: passcodes are exactly 4 digits, OTP/2FA inputs are 6 digits — reuse existing components.

## Output

Report what was scaffolded, the port/subdomain claimed (and the updated registry), which checklist items are done vs. need manual action (DNS, secrets in prod env), and run the app locally once to confirm it boots.
