# AI Layer — Architecture (Future)

> Implementation detail and folder layout: `src/ai/README.md`.
> This document is the product-level summary of what's reserved and why.

## Status: architecture reserved, nothing implemented

No AI provider is called anywhere in this codebase. This document and
`src/ai/` exist so that when AI work begins, it has a predefined home
and contract instead of being bolted onto `RequestService` or a
component ad-hoc.

## The four reserved modules

| Module | What it will do | Where it hooks in |
|---|---|---|
| **AI Request Assistant** | Helps a buyer turn a vague need into a clear, well-formed request (suggests a better title/description) | Called from the Create Request form before submit, purely additive — buyer can ignore the suggestion |
| **Automatic Category Detection** | Suggests a `Category` from free-text if the buyer didn't confidently pick one | Writes to `Request.aiSuggestedCategoryId` (already in schema), never overwrites the buyer's own `categoryId` |
| **Smart Matching** | Ranks/notifies suppliers whose profile or offer history best fits a newly published request | Reads from `Request`/`Offer`/`UserProfile`, writes via `NotificationService` with type `AI_SUGGESTION` |
| **AI Notifications** | Decides when a suggestion is valuable enough to surface ("similar requests got faster offers with a budget listed") | Same `AI_SUGGESTION` notification type, gated by a `feature_flags` `SiteSetting` |

## Non-negotiable design constraint: AI is advisory, never authoritative

No AI module publishes, accepts, rejects, or edits user content
automatically. Every suggestion is surfaced to a human who can accept,
edit, or dismiss it. This is enforced structurally, not just by
convention — see `src/ai/shared/types.ts`, where `AiSuggestion<T>` is
always a separate value alongside (never a replacement for) the
human-authored field.

## Kill switch

Every AI feature ships behind a `SiteSetting` feature flag
(`feature_flags` group — e.g. `enable_ai_assistant`,
`enable_smart_matching`). Any AI module can be disabled instantly from
the Admin Dashboard with zero deploy, which matters both for cost
control and for the (likely) event that a suggestion quality issue
needs an immediate off-switch.

## Provider abstraction

`AiProvider` (`src/ai/shared/types.ts`) is an interface. The concrete
implementation (OpenAI, Anthropic, a fine-tuned in-house model, or a
mix per-module) is chosen and wired up in Phase 2+ at a single
composition point, never imported directly by a service or component.
This keeps a future provider switch (or per-market provider choice, if
Arabic-first models outperform on this content) a one-file change.
