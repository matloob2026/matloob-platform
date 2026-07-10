/**
 * OfferService
 * ============
 * Suppliers respond to a Request with an Offer. Accepting an offer is a
 * cross-entity transaction (Offer -> ACCEPTED, Request -> IN_PROGRESS,
 * a Conversation is opened, other pending offers are left untouched so
 * the buyer can still change their mind) — that orchestration belongs
 * here, not in a route handler or a component.
 */

import type { Offer, OfferStatus } from "@/types/domain";

export interface CreateOfferInput {
  requestId: string;
  supplierId: string;
  message: string;
  price?: number;
}

export interface OfferService {
  create(input: CreateOfferInput): Promise<Offer>;
  accept(offerId: string, buyerId: string): Promise<Offer>;
  reject(offerId: string, buyerId: string): Promise<Offer>;
  withdraw(offerId: string, supplierId: string): Promise<Offer>;
  listForRequest(requestId: string, status?: OfferStatus): Promise<Offer[]>;
}

/**
 * TODO (Phase 2): implement against Prisma. `accept()` must run inside
 * a DB transaction: update Offer.status, Request.status, create the
 * Conversation + ConversationParticipant rows, and enqueue an
 * OFFER_ACCEPTED notification — all-or-nothing.
 */
export class PrismaOfferService implements OfferService {
  async create(_input: CreateOfferInput): Promise<Offer> {
    throw new Error("Not yet implemented — Phase 1 is architecture only.");
  }
  async accept(_offerId: string, _buyerId: string): Promise<Offer> {
    throw new Error("Not yet implemented — Phase 1 is architecture only.");
  }
  async reject(_offerId: string, _buyerId: string): Promise<Offer> {
    throw new Error("Not yet implemented — Phase 1 is architecture only.");
  }
  async withdraw(_offerId: string, _supplierId: string): Promise<Offer> {
    throw new Error("Not yet implemented — Phase 1 is architecture only.");
  }
  async listForRequest(_requestId: string, _status?: OfferStatus): Promise<Offer[]> {
    throw new Error("Not yet implemented — Phase 1 is architecture only.");
  }
}
