import type { FastifyInstance } from "fastify";
import z from "zod";

import { externalRateLimit } from "../../shared/rateLimit.js";
import { externalErrorResponses } from "../../shared/errors.js";
import { declareExternalScopes } from "../../shared/scopes.js";
import { requireLoyaltySubscription } from "./guards.js";
import { memberRefQuerySchema } from "./memberRef.js";
import * as C from "./loyalty.controller.js";
import * as S from "./loyalty.schema.js";

/**
 * The partner loyalty API.
 *
 * Every route declares a full `response` map. That is not bookkeeping: the serializer drops
 * keys a schema does not mention, so these are what stop Prisma rows reaching third parties
 * whole — which is what the previous version did, publishing every inbox column on Contact.
 * `loyalty.test.ts` asserts the property rather than trusting review.
 *
 * Members are named by phone or card code throughout. See `memberRef.ts` for why there is
 * no polymorphic `/{identifier}` segment.
 */
export async function externalLoyaltyRoutes(server: FastifyInstance) {
  const TAG = ["Loyalty"];

  // Reads need loyalty.read and the till's writes loyalty.cashier, as on the dashboard. A
  // balance correction is cashier too: it only files an approval request.
  declareExternalScopes(server, { read: "loyalty.read", write: "loyalty.cashier" });

  server.addHook("preHandler", requireLoyaltySubscription);

  // Per-org ceilings. Writes are held tighter than reads, and the two that cost real
  // money — enrolling someone, sending a WhatsApp card — tighter still, and fail closed.
  server.addHook(
    "preHandler",
    externalRateLimit({ max: 600, windowSeconds: 60, key: "extLoyalty" }),
  );

  // ---- programme & catalogue ------------------------------------------------

  server.get(
    "/ping",
    {
      schema: {
        tags: TAG,
        summary: "Check the key",
        description: "Confirms the API key works and the programme exists. Cheap to call at boot.",
        response: { 200: S.pingSchema, ...externalErrorResponses },
      },
    },
    C.pingHandler,
  );

  server.get(
    "/program",
    {
      schema: {
        tags: TAG,
        summary: "Get the loyalty programme",
        description: "Currency wording, signup bonus and tier settings, for rendering a receipt.",
        response: { 200: S.programSchema, ...externalErrorResponses },
      },
    },
    C.getProgramHandler,
  );

  server.get(
    "/tiers",
    {
      schema: {
        tags: TAG,
        summary: "List tiers",
        description: "The tier ladder, named. Tiers are referenced by name, never by id.",
        response: { 200: z.array(S.tierSchema), ...externalErrorResponses },
      },
    },
    C.getTiersHandler,
  );

  server.get(
    "/earning-rules",
    {
      schema: {
        tags: TAG,
        summary: "List active earning rules",
        description:
          "Enough to show an estimate before taking payment. The server always recalculates.",
        response: { 200: z.array(S.earningRuleSchema), ...externalErrorResponses },
      },
    },
    C.getEarningRulesHandler,
  );

  server.get(
    "/rewards",
    {
      schema: {
        tags: TAG,
        summary: "List rewards",
        description: "The catalogue. Each reward's `code` is what you name it by elsewhere.",
        response: { 200: z.array(S.rewardSchema), ...externalErrorResponses },
      },
    },
    C.getRewardsHandler,
  );

  server.get(
    "/rewards/:rewardCode",
    {
      schema: {
        tags: TAG,
        summary: "Get one reward",
        params: S.rewardCodeParamSchema,
        response: { 200: S.rewardSchema, ...externalErrorResponses },
      },
    },
    C.getRewardHandler,
  );

  // ---- members --------------------------------------------------------------

  server.get(
    "/members/lookup",
    {
      schema: {
        tags: TAG,
        summary: "Look a member up",
        description:
          "Everything a till needs in one call: balance, what they can buy, what is already " +
          "paid for and waiting, tier progress and recent history. Pass `phone` or `cardCode`.",
        querystring: memberRefQuerySchema,
        response: { 200: S.memberDetailSchema, ...externalErrorResponses },
      },
    },
    C.lookupMemberHandler,
  );

  server.get(
    "/members",
    {
      schema: {
        tags: TAG,
        summary: "List members",
        description: "Paginated. Search matches name, phone or email.",
        querystring: S.memberListQuerySchema,
        response: { 200: S.memberListSchema, ...externalErrorResponses },
      },
    },
    C.listMembersHandler,
  );

  server.get(
    "/members/preflight",
    {
      schema: {
        tags: TAG,
        summary: "Check a number before enrolling",
        description:
          "Whether the org already has a contact on this number and whether they have joined, " +
          "so a till can confirm a name rather than ask for it again.",
        querystring: S.preflightQuerySchema,
        response: { 200: S.preflightSchema, ...externalErrorResponses },
      },
    },
    C.preflightHandler,
  );

  server.post(
    "/members",
    {
      schema: {
        tags: TAG,
        summary: "Enrol a member",
        body: S.createMemberSchema,
        response: { 201: S.memberSchema, ...externalErrorResponses },
      },
      preHandler: [
        externalRateLimit({
          max: 60,
          windowSeconds: 3600,
          key: "extLoyaltyJoin",
          failClosed: true,
        }),
        externalRateLimit({
          max: 3,
          windowSeconds: 86_400,
          key: "extLoyaltyJoinPhone",
          // Digits only, so "+91 98…" and "9198…" share one bucket.
          keyFrom: (r) =>
            String((r.body as { phone?: unknown })?.phone ?? "").replace(/\D/g, "") || null,
          failClosed: true,
        }),
      ],
    },
    C.createMemberHandler,
  );

  server.patch(
    "/members",
    {
      schema: {
        tags: TAG,
        summary: "Update a member",
        body: S.updateMemberSchema,
        response: { 200: S.memberSchema, ...externalErrorResponses },
      },
    },
    C.updateMemberHandler,
  );

  server.post(
    "/members/card/send",
    {
      schema: {
        tags: TAG,
        summary: "Send the member's card on WhatsApp",
        description:
          "Only delivers inside the member's 24-hour WhatsApp window; outside it the " +
          "response says `session_closed` rather than pretending to have sent anything.",
        body: S.sendCardBodySchema,
        response: { 200: S.cardSendResultSchema, ...externalErrorResponses },
      },
      // A WhatsApp message, so a test key stops here like it does at every other send.
      config: { paid: true },
      preHandler: [
        externalRateLimit({
          max: 30,
          windowSeconds: 3600,
          key: "extLoyaltyCardSend",
          failClosed: true,
        }),
      ],
    },
    C.sendCardHandler,
  );

  // ---- points ---------------------------------------------------------------

  server.post(
    "/points/award",
    {
      schema: {
        tags: TAG,
        summary: "Award points for a purchase",
        description:
          "Send the same `Idempotency-Key` again to retry safely: the original award comes " +
          "back with `replayed: true` and the balance is untouched.",
        body: S.awardPointsBodySchema,
        response: { 200: S.awardResultSchema, ...externalErrorResponses },
      },
    },
    C.awardPointsHandler,
  );

  server.post(
    "/points/adjust",
    {
      schema: {
        tags: TAG,
        summary: "Correct a balance",
        description:
          "Negative points take them away — this is how an award is undone. Filed as an " +
          "approval request for staff to sign off, which is what keeps the audit trail.",
        body: S.adjustPointsBodySchema,
        response: { 200: S.adjustResultSchema, ...externalErrorResponses },
      },
    },
    C.adjustPointsHandler,
  );

  server.get(
    "/points/transactions",
    {
      schema: {
        tags: TAG,
        summary: "Read the ledger",
        description:
          "Filter by `orderId` or `idempotencyKey` to find out whether a write you lost the " +
          "reply to actually landed — check rather than retry.",
        querystring: S.transactionQuerySchema,
        response: { 200: S.transactionListSchema, ...externalErrorResponses },
      },
    },
    C.listTransactionsHandler,
  );

  // ---- rewards & vouchers ---------------------------------------------------

  server.post(
    "/rewards/:rewardCode/issue",
    {
      schema: {
        tags: TAG,
        summary: "Give a reward without charging points",
        params: S.rewardCodeParamSchema,
        body: S.issueRewardBodySchema,
        response: { 201: S.issueResultSchema, ...externalErrorResponses },
      },
    },
    C.issueRewardHandler,
  );

  server.post(
    "/rewards/:rewardCode/redeem",
    {
      schema: {
        tags: TAG,
        summary: "Spend points on a reward",
        params: S.rewardCodeParamSchema,
        body: S.redeemRewardBodySchema,
        response: { 200: S.redeemResultSchema, ...externalErrorResponses },
      },
    },
    C.redeemRewardHandler,
  );

  server.get(
    "/vouchers/:code",
    {
      schema: {
        tags: TAG,
        summary: "Check a voucher without using it",
        description:
          "Pass whatever was scanned — a redemption code or a gift's short code. Read this " +
          "before handing anything over.",
        params: S.voucherCodeParamSchema,
        response: { 200: S.voucherSchema, ...externalErrorResponses },
      },
    },
    C.getVoucherHandler,
  );

  server.post(
    "/vouchers/:code/redeem",
    {
      schema: {
        tags: TAG,
        summary: "Mark a voucher used",
        params: S.voucherCodeParamSchema,
        body: S.applyVoucherBodySchema,
        response: { 200: S.voucherRedeemResultSchema, ...externalErrorResponses },
      },
    },
    C.redeemVoucherHandler,
  );
}
