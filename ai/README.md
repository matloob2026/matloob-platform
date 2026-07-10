# AI Layer Architecture (Future — Not Implemented)

## Purpose

This folder exists so that when AI features are built, they slot into
a predefined architecture instead of being bolted onto business logic
ad-hoc. **Nothing in this folder is implemented or called by the
application today.** It exists purely as a contract for Phase 2+.

## Design principle: AI is advisory, never authoritative

Every AI module below produces a *suggestion* that a human (the buyer,
or an admin) can accept, edit, or ignore. No AI module is allowed to:
- publish a Request on a user's behalf without confirmation,
- auto-accept/reject an Offer,
- silently modify user-submitted text.

This is why the schema already has fields like `Request.aiSuggestedCategoryId`
and `Request.aiQualityScore` sitting *alongside* the human-authored
`categoryId` and `description` — the AI's opinion is additive data, not
a replacement.

## Planned modules

```
src/ai/
  README.md                 <- this file
  shared/
    types.ts                <- AiSuggestion<T>, AiConfidence, provider interface
    provider.ts             <- swappable LLM provider abstraction
  assistant/
    request-assistant.ts    <- "AI Request Assistant": helps a buyer turn
                                a vague need into a clear, well-formed
                                Request (title/description suggestions)
  categorization/
    auto-categorize.ts      <- suggests Category from free-text input,
                                populates Request.aiSuggestedCategoryId
  matching/
    smart-matching.ts       <- ranks/notifies suppliers whose past offers
                                or profile best match a new Request
  notifications/
    ai-notification-triggers.ts
                             <- decides when an AI_SUGGESTION notification
                                is worth sending (e.g. "3 similar requests
                                got offers within an hour — yours might too
                                if you add a budget")
```

## Shared contract (to be implemented in `shared/types.ts`)

```ts
export interface AiSuggestion<T> {
  value: T;
  confidence: number; // 0..1
  reasoning?: string; // shown to the user/admin as "why we suggested this"
  modelVersion: string;
}

export interface AiProvider {
  suggestCategory(freeText: string): Promise<AiSuggestion<string>>;
  improveRequestText(input: { title: string; description: string }): Promise<
    AiSuggestion<{ title: string; description: string }>
  >;
  rankSuppliersForRequest(requestId: string): Promise<AiSuggestion<string[]>>;
}
```

`AiProvider` is an interface, not a concrete OpenAI/Anthropic
implementation — so the underlying model/vendor can change without
touching `request.service.ts` or any component. Whichever service
needs an AI suggestion depends on the interface, and a concrete
`OpenAiProvider` / `AnthropicProvider` is dependency-injected at the
composition root (`src/lib/container.ts`, Phase 2).

## Integration points already reserved in the schema

- `Request.aiSuggestedCategoryId`, `Request.aiQualityScore` (see
  `prisma/schema.prisma`)
- `NotificationType.AI_SUGGESTION` enum value
- `SiteSetting` group `feature_flags` will hold `enable_ai_assistant`,
  `enable_smart_matching` toggles so any AI feature can be killed
  instantly from the Admin Dashboard without a deploy.

## Explicitly out of scope for now

- No AI model calls anywhere in the codebase yet.
- No AI-related environment variables in `.env.example` yet — added
  only when a provider is actually chosen and implemented.
