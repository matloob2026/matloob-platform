/**
 * Shared AI layer contracts. See src/ai/README.md for the full
 * architecture rationale. Nothing in this file is called by the
 * application yet — Phase 1 is architecture only.
 */

export interface AiSuggestion<T> {
  value: T;
  confidence: number; // 0..1 — UI should hide/downplay suggestions below a threshold
  reasoning?: string; // human-readable explanation, shown on hover/expand
  modelVersion: string; // e.g. "gpt-4o-2024-08-06" — logged for reproducibility
}

/**
 * Swappable provider abstraction. A concrete implementation
 * (OpenAiProvider, AnthropicProvider, etc.) is instantiated once at the
 * composition root and injected into whichever service needs it —
 * business logic never imports a vendor SDK directly.
 */
export interface AiProvider {
  suggestCategory(freeText: string): Promise<AiSuggestion<string>>;

  improveRequestText(input: {
    title: string;
    description: string;
  }): Promise<AiSuggestion<{ title: string; description: string }>>;

  rankSuppliersForRequest(requestId: string): Promise<AiSuggestion<string[]>>;
}

/**
 * Every AI-assisted write path in the app should route through this
 * shape rather than storing raw model output, so quality can be
 * measured/audited later (which suggestions get accepted vs. ignored).
 */
export interface AiSuggestionLogEntry {
  id: string;
  entityType: "request" | "category" | "supplier_match";
  entityId: string;
  suggestion: AiSuggestion<unknown>;
  wasAccepted: boolean | null; // null = user hasn't decided yet
  createdAt: string;
}
