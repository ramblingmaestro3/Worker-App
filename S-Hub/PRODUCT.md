# Product

## Register

product

## Users

AdwumaGo is a two-sided local-services marketplace for Ghana. Two user types:

- **Clients** who need a task done (repairs, cleaning, skilled trades, professional services) and want to find vetted local workers quickly, compare bids, and book with confidence.
- **Workers** who want visibility to nearby job requests, a fair way to bid, and a path to build a verified reputation.

Context of use: primarily mobile, often on constrained data plans and mid-range Android devices. Trust is the central anxiety on both sides — clients letting a stranger into their home/business, workers extending credit-of-labor before payment is certain.

## Product Purpose

Connect trusted local workers with clients needing tasks done, through job posting, bid comparison, booking, in-app chat, and a verification/rating system that makes trust legible before any money or access changes hands. Success = a client posts a job and books a worker (or a worker finds and wins a job) without friction or doubt about who they're dealing with.

## Brand Personality

Professional & minimal. Efficient, competent, no-nonsense — the app should read as a serious utility for getting local work done, not a flashy consumer gig app. Warmth comes through reassurance (verification, ratings, clear pricing) rather than through playful visuals or heavy motion.

## Anti-references

- Generic Uber/Fiverr-style onboarding template: icon-in-circle + headline + subhead + dot pager, repeated per slide. This is the current implementation and reads as interchangeable with every other gig marketplace app.
- Corporate SaaS coldness: dense text, enterprise-dashboard blues, low personality.
- Anything that adds visual weight (heavy illustration, gradients, animation-heavy transitions) without earning its data cost.

## Design Principles

1. **Trust is the product.** Every screen should reduce doubt — through clarity, specificity, and evidence (verification, ratings) — rather than through decoration.
2. **Efficient over flashy.** Professional & minimal personality: get the user to their task fast, no filler motion or ornament.
3. **Data-conscious by default.** Users are often on constrained connections and mid-range devices — avoid heavy images, avoid animation that isn't functional, keep payloads light.
4. **Don't look like the category default.** Explicitly avoid the generic gig-marketplace onboarding template (icon circle + headline + dots) that every competitor ships.
5. **One system, not one screen.** Onboarding should extend the existing warm-dark Ghana-flag palette and component language already used across the app (sign-in, sign-up), not introduce a parallel visual system.

## Accessibility & Inclusion

- Data/bandwidth conscious: minimize reliance on heavy imagery or animation; prefer vector icons and lightweight motion over image assets or video.
- Standard WCAG AA contrast and touch-target sizing throughout.
- Respect `prefers-reduced-motion` / OS-level reduced-motion settings for any onboarding transitions.
