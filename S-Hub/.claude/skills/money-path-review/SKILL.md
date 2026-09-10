---
name: money-path-review
description: Reviews any diff touching AZA money movement — wallets, transfers, payouts, withdrawals, agent float, checkout, Connect marketplace — against the platform's financial invariants (balanced ledger, idempotency, maker-checker, passcode, GHS-only scope). Use when changes touch TransferService, WalletService, payout/withdrawal/checkout code, or before deploying anything that moves money.
---

# Money Path Review

AZA is a fintech; a wrong money path is the worst bug class this codebase can ship. The June 2026 audit's critical finding was a withdrawal flow that **never debited the wallet**. Review with that as the calibration: assume the bug exists until each invariant is checked. Default to flagging.

## Scope

Money code lives mainly in `backend/src/main/java/com/aza/backend/service/` — `TransferService`, `WalletService`, `BulkTransferService`, `RecurringTransferService`, superagent/agent float services, checkout/Connect services — plus their controllers and DTOs. If the diff touches none of these and no balance/amount field, say so and stop.

## Invariants — every one gets checked against the diff

1. **Balanced movement.** Every credit has a matching debit in the same transaction. A payout, withdrawal, or transfer that credits a destination (or triggers an external disbursement) without debiting the source wallet in the same transactional boundary is CRITICAL.
2. **Debit before external effect.** Wallet debit commits before (or atomically with) any external side effect (FCM, webhook, provider call). Never fire the external effect first and debit on callback.
3. **Idempotency.** Every money-moving endpoint takes an idempotency key, and the key is **scoped to the tenant/user** — a cross-tenant idempotency collision leaks other users' results (this exact bug was found and fixed in `SuperAgentService`; `AgentCashService` idempotency was still open as of June 2026 — check it whenever nearby code changes).
4. **Concurrency-safe balance updates.** Balance reads/writes use row locking or atomic DB updates, not read-modify-write in Java. Two parallel requests must not double-spend.
5. **BigDecimal only.** No `double`/`float` anywhere near an amount. Amounts validated positive, non-null, and within limits at the boundary.
6. **AuthZ + passcode.** Consumer-initiated money flows verify the 4-digit passcode; admin-initiated money ops go through maker-checker (no single admin moves funds alone); merchant/partner ops check API-key scope and ownership (no acting on another tenant's wallet by ID).
7. **Product scope.** v1 is Ghana-only, GHS-only, internal transfers. Any code path implying multi-currency, FX, or external rails is out of scope and a finding unless the user has said otherwise.
8. **Superagent float rule.** SUPER-tier float distribution is an internal transfer with **no margin** — any fee/markup appearing in float distribution is a finding.
9. **Audit trail.** Every money movement writes its transaction/ledger record inside the same transaction, with enough metadata for recon (the back-office recon/safeguarding jobs consume these).

## Method

1. Map each changed endpoint/service method to the flow it belongs to (transfer, withdrawal, payout, float, checkout, refund/split).
2. For each flow, trace the full path: validation → authZ/passcode → idempotency check → debit → credit → record → external effects. Note which step each invariant is enforced at, or that it isn't.
3. Actively construct the failure scenario: duplicate request, concurrent request, crash between debit and credit, callback replay, negative/zero amount, acting on someone else's wallet ID.

## Output

Findings table `| Severity | File:Line | Invariant | Failure scenario | Fix |`, most severe first (CRITICAL = money lost/created/duplicated; HIGH = authZ or idempotency gap; MEDIUM = audit/validation gap). Close with an explicit **Block** or **Approve**. Approve requires every invariant explicitly verified, not just "nothing jumped out."
