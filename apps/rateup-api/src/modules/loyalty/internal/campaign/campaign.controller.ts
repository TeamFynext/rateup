import { FastifyReply, FastifyRequest } from "fastify";
import { ByCampaignIdParams } from "./campaign.schema";
import {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaigns,
  getInsights,
  getLoyaltyCampaignInsights,
  getParticipantsByCampaignId,
  updateCampaign,
} from "./campaign.service";
import { CreateCampaignInput } from "../../../campaign/campaign.schema";
import { BylCustomerIdParam } from "../customer/customer.schema";
import {
  getLCustomerById,
  getLCustomerByPhone,
} from "../customer/customer.service";
import { randomUUID } from "crypto";
import { createReferralCode } from "../referralCode/referralCode.service";

export async function createCampaignHandler(
  req: FastifyRequest<{
    Body: CreateCampaignInput;
  }>,
  res: FastifyReply,
) {
  const campaign = await createCampaign({ ...req.body, orgId: req.user.orgId });
  res.send(campaign);
}

export async function getCampaignsHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const campaigns = await getCampaigns(req.user.orgId);
  res.send(campaigns);
}

export async function getCampaignByIdHandler(
  req: FastifyRequest<{ Params: ByCampaignIdParams }>,
  res: FastifyReply,
) {
  const campaign = await getCampaignById(req.params.campaignId);
  res.send(campaign);
}
export async function getPublicCampaignByIdHandler(
  req: FastifyRequest<{ Params: ByCampaignIdParams }>,
  res: FastifyReply,
) {
  const campaign = await getCampaignById(req.params.campaignId);
  res.send(campaign);
}

export async function updateCampaignHandler(
  req: FastifyRequest<{ Params: ByCampaignIdParams }>,
  res: FastifyReply,
) {
  const campaign = await updateCampaign(req.params.campaignId, req.body);
  res.send(campaign);
}

export async function deleteCampaignHandler(
  req: FastifyRequest<{ Params: ByCampaignIdParams }>,
  res: FastifyReply,
) {
  const campaign = await deleteCampaign(req.params.campaignId);
  res.send(campaign);
}

export async function registerCampaignHandler(
  req: FastifyRequest<{
    Params: ByCampaignIdParams;
    Body: { phone: string };
  }>,
  res: FastifyReply,
) {
  const customer = await getLCustomerByPhone(req.user.orgId, req.body.phone);
  const newRcode = {
    orgId: req.user.orgId,
    customerId: customer.id,
    loyaltyCampaignId: req.params.campaignId,
    referralCode: randomUUID(),
  };
  const referralCode = await createReferralCode(newRcode);

  res.send(referralCode);
}

export async function getCampaignParticipantsHandler(
  req: FastifyRequest<{ Params: ByCampaignIdParams }>,
  res: FastifyReply,
) {
  res.send(await getParticipantsByCampaignId(req.params.campaignId));
}

export async function getInsightsHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const result = await getInsights(orgId);
  res.send(result);
}

export async function getLoyaltyCampaignInsightsHandler(
  req: FastifyRequest<{
    Params: ByCampaignIdParams;
  }>,
  res: FastifyReply,
) {
  const { campaignId } = req.params;
  const result = await getLoyaltyCampaignInsights(campaignId);
  res.send(result);
}
