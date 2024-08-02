import { google } from "googleapis";
import { IntegratedApps } from "../../types/enums";
import prisma from "../../utils/prisma";
import { callWaAmeliaApi } from "./integration_axios";
import {
  IntegrationSchema,
  UpdateIntgrationInput,
} from "./integrations.schema";
import { getDriveFolderId } from "../response/response.service";

export const getAllIntegrations = (orgId: string) => {
  return prisma.integration.findMany({
    where: {
      orgId,
    },
  });
};

export const getIntegrationByName = async (orgId: string, name: string) => {
  const data = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name,
      },
    },
  });
  return data;
};

export const createIntegration = (data: IntegrationSchema, orgId?: string) => {
  return prisma.integration.create({
    data: {
      name: data.name,
      credential: data.credential,
      orgId: orgId ?? undefined,
    },
  });
};

export const updateIntegrationByName = (
  orgId: string,
  name: string,
  data: UpdateIntgrationInput,
) => {
  return prisma.integration.update({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name,
      },
    },
    data,
  });
};

export const deleteIntegrationByName = (name: string, orgId: string) => {
  return prisma.integration.delete({
    where: {
      orgid_integration_name_unique: {
        name,
        orgId,
      },
    },
  });
};

interface AmeliaApiRequest {
  url: string;
  startDateTime: string;
  method: string;
  acessToken: string;
  serviceId?: number;
  persons?: number;
  extras?: any[];
}

export const getWaAmeliaTimeSlot = async ({
  url,
  startDateTime,
  method,
  acessToken,
  serviceId = 3,
  persons = 1,
  extras = [],
}: AmeliaApiRequest) => {
  try {
    const data = await callWaAmeliaApi(
      `${url}/slots&locationId=&serviceId=${serviceId}&serviceDuration=&providerIds=&persons=${persons}&startDateTime=${startDateTime}&extras=${extras}`,
      method,
      acessToken,
    );
    return data;
  } catch (error) {
    console.log("error from wa amel", error);
  }
};

export async function initializeAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${process.env.FRONTEND_URL}/auth/oauth2callback`,
  );
  google.options({ auth: oauth2Client });
  return oauth2Client;
}

export async function getGoogleAuthUrl() {
  const scopes = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
  ];
  const oauth2Client = await initializeAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes.join(" "),
    prompt: "consent",
  });
}

export async function removeSurveySpreadSheetSheetId(orgId) {
  await prisma.survey.updateMany({
    where: {
      orgId,
    },
    data: {
      spreadSheetId: null,
    },
  });
}
