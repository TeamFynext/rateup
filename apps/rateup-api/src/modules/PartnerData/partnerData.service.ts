import prisma from "../../utils/prisma.js";
import { notificationQueue } from "../../utils/redisConnection.js";

export interface PartnerDataInput {
  fullName: string;
  workEmail: string;
  phone: string;
  companyName: string;
  website: string;
  country: string;
  businessType: string;
  companySize: string;
  yearsInBusiness: string;
  whyPartner: string;
  services: string[];
  referralVolume: string;
  managesClients: string;
  apiExperience: string;
  canOnboard: string;
}

export const createPartnerData = async (data: PartnerDataInput) => {
  try {
    const newPartner = await prisma.partnerData.create({
      data,
    });

    return {
      success: true,
      data: newPartner,
    };
  } catch (error) {
    console.error("Error creating PartnerData:", error);
    return {
      success: false,
      error: "Failed to create PartnerData entry",
    };
  }
};

export const sendPartnerDataEmail = async (data: PartnerDataInput) => {
  try {
    const subject = `New Partner Inquiry from ${data.fullName}`;
    const text = `
      You have a new partner inquiry:

      Name: ${data.fullName}
      Email: ${data.workEmail}
      Phone: ${data.phone}
      Company: ${data.companyName}
      Website: ${data.website}
      Country: ${data.country}
      Business Type: ${data.businessType}
      Company Size: ${data.companySize}
      Years in Business: ${data.yearsInBusiness}
      Why Partner: ${data.whyPartner}
      Services: ${data.services.join(", ")}
      Referral Volume: ${data.referralVolume}
      Manages Clients: ${data.managesClients}
      API Experience: ${data.apiExperience}
      Can Onboard: ${data.canOnboard}
    `;

    const html = `
      <h2>New Partner Inquiry</h2>
      <p><strong>Name:</strong> ${data.fullName}</p>
      <p><strong>Email:</strong> ${data.workEmail}</p>
      <p><strong>Phone:</strong> ${data.phone}</p>
      <p><strong>Company:</strong> ${data.companyName}</p>
      <p><strong>Website:</strong> ${data.website}</p>
      <p><strong>Country:</strong> ${data.country}</p>
      <p><strong>Business Type:</strong> ${data.businessType}</p>
      <p><strong>Company Size:</strong> ${data.companySize}</p>
      <p><strong>Years in Business:</strong> ${data.yearsInBusiness}</p>
      <p><strong>Why Partner:</strong> ${data.whyPartner}</p>
      <p><strong>Services:</strong> ${data.services.join(", ")}</p>
      <p><strong>Referral Volume:</strong> ${data.referralVolume}</p>
      <p><strong>Manages Clients:</strong> ${data.managesClients}</p>
      <p><strong>API Experience:</strong> ${data.apiExperience}</p>
      <p><strong>Can Onboard:</strong> ${data.canOnboard}</p>
    `;

    await notificationQueue.add("notification", {
      emailData: {
        to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
        subject: subject,
        html: html,
        text: text,
      },
    });

    return {
      success: true,
      message: "Partner inquiry email sent successfully",
    };
  } catch (error) {
    console.error("Error sending partner data email:", error);
    return {
      success: false,
      error: "Failed to send partner inquiry email",
    };
  }
};
