import { FastifyReply, FastifyRequest } from "fastify";
import { SubscriptionFeaturePathName } from "../types/enums.js";
import { getNestedProperty } from "./misc/obj.utils.js";

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
