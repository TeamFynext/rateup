import prisma from "../../utils/prisma.js";

export interface BookDemoInput {
  firstName: string;
  lastName: string;
  workEmail: string;
  phoneNumber: string;
  companyName: string;
  teamSize: string;
  preferredTime: string;
  primaryUseCase: string;
  additionalInfo: string;
}

export const createBookDemo = async (data: BookDemoInput) => {
  try {
    const newDemo = await prisma.bookDemo.create({
      data,
    });

    return {
      success: true,
      data: newDemo,
    };
  } catch (error) {
    console.error("Error creating BookDemo:", error);
    return {
      success: false,
      error: "Failed to create BookDemo entry",
    };
  }
};
