import { FastifyReply, FastifyRequest } from "fastify";
import { SubscriptionFeaturePathName } from "../types/enums.js";
import { getNestedProperty } from "./misc/obj.utils.js";

/**
 * The one per-org "how many of these may this plan have" gate.
 *
 * Four near-identical copies of this preHandler lived in the codebase — flows,
 * templates, campaigns and automated replies — and the same two defects were
 * recorded against each of them separately (issues.txt 11.7, 14.7, 17.2):
 *
 *   - `count >= feature?.count?.max` compares against undefined when the plan
 *     states no maximum, which is always false and reads like a check. A plan
 *     that names no maximum means NO LIMIT, and saying so explicitly is what
 *     stops the next reader assuming the gate does something.
 *   - The count query sat inside the try/catch, so a database outage was answered
 *     as a 403 carrying the raw error text ("connection terminated unexpectedly")
 *     with displayMessageInClient set — an infrastructure failure dressed up as a
 *     permission refusal, shown to the user. The query is deliberately OUTSIDE any
 *     catch here, so it surfaces as a 500.
 *
 * SubscriptionFeatures[Whatsapp] has no top-level `count` in any plan today (only
 * `conversation.count`, see subscription.data.ts), so these limits are currently
 * inert. They are kept, rather than deleted, because a plan that does name a
 * `whatsapp.count.max` is enforced the moment it exists.
 *
 * Returns a reply when the request is refused, and undefined when it may proceed —
 * the shape fastify expects from a preHandler.
 */
export async function enforceWhatsappCountLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  options: {
    /** Pluralised, for the message: "maximum limit of 5 Flows". */
    label: string;
    count: (orgId: string) => Promise<number>;
  },
): Promise<FastifyReply | undefined> {
  const subscription = request.subscription;
  if (!subscription) {
    return reply.code(403).send({
      message: "Subscription not found",
      displayMessageInClient: true,
    });
  }

  const feature = getNestedProperty<{ count?: { max?: number } }>(
    subscription.features as object,
    SubscriptionFeaturePathName.Whatsapp,
  );
  const max = feature?.count?.max;
  if (max === undefined) return;

  const used = await options.count(request.user.orgId);
  if (used >= max) {
    return reply.code(403).send({
      message: `You have reached the maximum limit of ${max} ${options.label}.`,
      displayMessageInClient: true,
    });
  }
}
