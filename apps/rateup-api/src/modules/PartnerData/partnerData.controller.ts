import { FastifyReply, FastifyRequest } from "fastify";
import {
  createPartnerData,
  sendPartnerDataEmail,
} from "./partnerData.service.js";
import { CreatePartnerDataInput } from "./partnerData.schema.js";

export async function partnerDataHandler(
  request: FastifyRequest<{ Body: CreatePartnerDataInput }>,
  reply: FastifyReply,
) {
  try {
    const {
      fullName,
      workEmail,
      phone,
      companyName,
      website,
      country,
      businessType,
      companySize,
      yearsInBusiness,
      whyPartner,
      services,
      referralVolume,
      managesClients,
      apiExperience,
      canOnboard,
    } = request.body;

    const savedPartner = await createPartnerData({
      fullName,
      workEmail,
      phone,
      companyName,
      website,
      country,
      businessType,
      companySize,
      yearsInBusiness,
      whyPartner,
      services,
      referralVolume,
      managesClients,
      apiExperience,
      canOnboard,
    });

    if (!savedPartner.success) {
      return reply.status(400).send({
        success: false,
        message: "Failed to save partner data",
      });
    }

    // Send email notification
    const emailResult = await sendPartnerDataEmail({
      fullName,
      workEmail,
      phone,
      companyName,
      website,
      country,
      businessType,
      companySize,
      yearsInBusiness,
      whyPartner,
      services,
      referralVolume,
      managesClients,
      apiExperience,
      canOnboard,
    });

    if (!emailResult.success) {
      console.error("Failed to send partner data email");
      // Don't fail the request if email sending fails
    }

    return reply.status(201).send({
      success: true,
      message: "Partner data submitted successfully",
      data: savedPartner.data,
    });
  } catch (error) {
    console.error("Error in partnerDataHandler:", error);
    return reply.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
}
