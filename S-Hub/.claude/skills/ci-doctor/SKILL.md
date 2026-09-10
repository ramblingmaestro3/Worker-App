---
name: ci-doctor
description: Diagnoses and fixes failed CI runs for the AZA monorepo the fast way — pulls failing logs via gh, reproduces with the exact CI commands locally, and knows the repo's recurring CI traps (missing .env in CI, lockfile platform blocks, React Compiler lint). Use when CI is red, a GitHub Actions run failed, or before pushing to predict whether CI will pass.
---

# CI Doctor

Never debug CI by pushing guess commits. Diagnose from logs, reproduce locally with the *exact* CI command, fix, verify locally, push once.

## Step 1 — Get the failure

```bash
gh run list --branch <branch> --limit 5        # find the red run
gh run view <run-id> --log-failed              # only the failing step's log
```

Read the first real error, not the last line — Maven and Next.js both bury the root cause above pages of follow-on noise.

## Step 2 — Reproduce with the CI command, not your habit command

CI does not run what you run locally. Match it:

- **Backend**: CI runs `mvn test` with **no `.env` file** — spring-dotenv loads nothing there. A test that passes locally but fails in CI with a missing-property error needs the property provided in test config (`application-test.yml` / `@TestPropertySource`), not in `.env`. This exact class of failure happened with the payment-proof HMAC property.
- **Web apps** (`aza-web`, `aza-admin`, `aza-merchants`, `aza-pay`, `aza-superagents`): run `npm run lint` and `npm run build` in that app's directory. Lint failures that don't show in the editor are usually **React Compiler** lint rules (previously hit in merchants' DocumentCapture).
- Run the reproduction from a clean state when the failure smells environmental (`rm -rf node_modules && npm ci`, or `mvn -q clean test`).

## Known traps (check these before deep debugging)

1. **Lockfile missing platform binaries** — `package-lock.json` generated on macOS can lack the Linux native blocks (hit before with Tailwind's oxide binary in aza-admin). Symptom: CI-only "Cannot find module @tailwindcss/oxide-linux-*". Fix: regenerate the lockfile with `npm install --force` including optional deps, or `npm i` the missing platform package explicitly; verify the linux entry exists in the lockfile before pushing.
2. **Env-dependent tests** — anything reading `System.getenv`/dotenv passes locally, dies in CI. Provide test-scoped properties.
3. **Image build/push steps** — deploy workflows push to `ghcr.io/az-spaces`; auth/permission failures there are usually the `GITHUB_TOKEN`/PAT scope, not the Dockerfile.
4. **New app not wired into CI** — a new workspace/app fails or is silently skipped if the workflow matrix wasn't updated.

## Step 3 — Fix, verify, push

Apply the fix, re-run the exact CI command locally until green, then push. After pushing, watch the run (`gh run watch <run-id>` or re-check `gh run list`) and report the final CI status — "pushed a fix" is not done; green is done.

## Output

State the root cause in one sentence, what the fix was, the local verification command + result, and the final CI status.
