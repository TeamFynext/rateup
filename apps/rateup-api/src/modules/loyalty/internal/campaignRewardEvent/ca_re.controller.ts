import { FastifyRequest, FastifyReply } from "fastify";
import {
  CreateCaRewardEventBody,
  byCampaignRewardEventIdParams,
} from "./ca_re.schema";
import {
  createCampaignRewardEvent,
  getCampaignRewardEventById,
  getCampaignRewardsByCampaignId,
} from "./ca_re.service";
import { ByCampaignIdParams } from "../campaign/campaign.schema";
import {
  getLCustomerByReferralCode,
  getOrCreateLCustomerByPhone,
} from "../customer/customer.service";
import { LoyaltyCustomer } from "@prisma/client";

export async function createCampaignRewardEventHandler(
  request: FastifyRequest<{
    Body: CreateCaRewardEventBody;
    Params: ByCampaignIdParams;
  }>,
  reply: FastifyReply,
) {
  const { referralCode, phone, transactionAmount } = request.body;
  const { campaignId } = request.params;
  let referrer: LoyaltyCustomer;
  if (referralCode) {
    referrer = await getLCustomerByReferralCode(referralCode);
  }

  const customer = await getOrCreateLCustomerByPhone(request.user.orgId, phone);

  const ca_REvent = await createCampaignRewardEvent({
    referrerId: referrer?.id,
    loyaltyCampaignId: campaignId,
    transactionAmount,
    customerId: customer.id,
  });

  reply.send(ca_REvent);
}

export async function getCampaignRewardEvents_ByCampaignIdHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
  }>,
  reply: FastifyReply,
) {
  const ca_REvents = await getCampaignRewardsByCampaignId(
    request.params.campaignId,
  );
  reply.send(ca_REvents);
}

export async function getCampaignRewardEvent_ByIdHandler(
  request: FastifyRequest<{
    Params: byCampaignRewardEventIdParams;
  }>,
  reply: FastifyReply,
) {
  const ca_REvent = await getCampaignRewardEventById(
    request.params.campaignRewardEventId,
  );
  reply.send(ca_REvent);
}
