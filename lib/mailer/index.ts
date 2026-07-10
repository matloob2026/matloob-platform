/**
 * Single import point for the rest of the app: `import { mailer } from
 * "@/lib/mailer"`. See mailer.interface.ts for the swap-point contract.
 */

import { ConsoleMailer } from "./console.mailer";
import type { Mailer } from "./mailer.interface";

export type { Mailer, MailMessage } from "./mailer.interface";

// Phase 3 — Part 1: ConsoleMailer only. Swapping in a real provider for
// production is a one-line change here (see TODO in mailer.interface.ts)
// — no other file imports ConsoleMailer directly.
export const mailer: Mailer = new ConsoleMailer();
