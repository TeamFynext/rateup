/**
 * Raised when a campaign — or something a request named alongside it — is not the
 * caller's. Handlers answer 404 rather than 403: a campaign another org owns should
 * be indistinguishable from one that never existed. See issues.txt 17.3.
 *
 * It lives in its own module, rather than in campaign.service.ts, so importing it
 * does not drag that module's dependency graph — Prisma, BullMQ, the Redis
 * connection — behind it.
 */
export class CampaignNotFoundError extends Error {
  constructor(message = "Campaign not found") {
    super(message);
    this.name = "CampaignNotFoundError";
  }
}
