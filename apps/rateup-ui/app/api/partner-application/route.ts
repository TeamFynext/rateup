import { createError, defineEventHandler, readBody } from "h3";
import { z } from "zod/v4";

import { partnerApplicationSchema } from "@/components/RateupHomePage/schema";

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method Not Allowed",
    });
  }

  try {
    const body = await readBody(event);

    // Validate with Zod schema
    const validatedData = partnerApplicationSchema.parse(body);

    // Setup email transporter
    // TODO: Integrate with your email service (Resend, SendGrid, Mailgun, etc.)
    // For now, just log the data
    console.log("Partner Application Submission:", validatedData);

    // Prepare email content
    const emailContent = `
    <h2>New Partner Application Submission</h2>
    <h3>Basic Information</h3>
    <p><strong>Full Name:</strong> ${validatedData.fullName}</p>
    <p><strong>Email:</strong> ${validatedData.workEmail}</p>
    <p><strong>Phone:</strong> ${validatedData.phone}</p>
    <p><strong>Company Name:</strong> ${validatedData.companyName}</p>
    <p><strong>Website:</strong> ${validatedData.website || "N/A"}</p>
    <p><strong>Country/Region:</strong> ${validatedData.country}</p>
    
    <h3>Business Details</h3>
    <p><strong>Business Type:</strong> ${validatedData.businessType}</p>
    <p><strong>Company Size:</strong> ${validatedData.companySize}</p>
    <p><strong>Years in Business:</strong> ${validatedData.yearsInBusiness}</p>
    
    <h3>Partnership Qualification</h3>
    <p><strong>Why Partner with RateUp:</strong> ${validatedData.whyPartner}</p>
    <p><strong>Services Offered:</strong> ${validatedData.services.join(", ")}</p>
    <p><strong>Clients per Month:</strong> ${validatedData.referralVolume}</p>
    <p><strong>Manages Business Clients:</strong> ${validatedData.managesClients}</p>
    
    <h3>Technical & Sales Capability</h3>
    <p><strong>API Experience:</strong> ${validatedData.apiExperience}</p>
    <p><strong>Can Provide Onboarding:</strong> ${validatedData.canOnboard}</p>
    `;

    // Send email
    // TODO: Implement email sending to hello+demo@rateup.app
    // Example implementation:
    /*
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: \"hello+demo@rateup.app\",
      subject: `New Partner Application from ${validatedData.fullName}`,
      html: emailContent,
      replyTo: validatedData.workEmail,
    });
    */

    return {
      success: true,
      message: "Application submitted successfully",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "Validation error",
        data: {
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }

    console.error("Partner application error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to submit application",
    });
  }
});
