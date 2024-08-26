import { google } from "googleapis";
import { IntegratedApps } from "../../types/enums";
import prisma from "../../utils/prisma";
import { callWaAmeliaApi } from "./integration_axios";
import {
  IntegrationSchema,
  UpdateIntgrationInput,
  WaPaymentCreateSchema,
} from "./integrations.schema";
import { getDriveFolderId } from "../response/response.service";
import { callWhatsappApi } from "../whatsapp/wa_axios";
import { log } from "../../utils/logger";
import { getWaSettings } from "../whatsapp/settings/wa_settings.service";

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

export const getWaPaymentConfigurations = async (
  orgId: string,
  noDbSave = false,
) => {
  const waSettings = await getWaSettings(orgId);
  const res = await callWhatsappApi(
    `/${waSettings.wabaId}/payment_configurations`,
    "GET",
    waSettings.accessToken,
  );
  if (res.status !== 200) {
    log.error("Error getting wa payment configurations => %o", res.data);
    throw new Error("Error creating template in whatsapp");
  }
  if (noDbSave) return res?.data;

  const filteredConfigurations =
    res?.data?.data?.flatMap((item) => item?.payment_configurations) || [];
  const waPayment: any = await getIntegrationByName(
    orgId,
    IntegratedApps.waPayment,
  );
  const mapedData = filteredConfigurations.map((itemA) => {
    const matchingItemB = waPayment?.credential?.find(
      (itemB) => itemB.configuration_name === itemA.configuration_name,
    );
    return matchingItemB
      ? {
          ...itemA,
          ...{
            oauth_url: matchingItemB?.oauth_url,
            expiration: matchingItemB?.expiration,
          },
        }
      : itemA;
  });
  const data = await prisma.integration.update({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: IntegratedApps.waPayment,
      },
    },
    data: {
      credential: mapedData,
    },
  });
  return data;
};

export const getRegenerateWaPaymentConfigOauth = async (
  orgId: string,
  name: string,
) => {
  const data: any = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: IntegratedApps.waPayment,
      },
    },
  });
  if (!data) throw new Error("No integration found");
  const waSettings = await getWaSettings(orgId);
  const res = await callWhatsappApi(
    `/${waSettings.wabaId}/generate_payment_configuration_oauth_link`,
    "POST",
    waSettings.accessToken,
    {
      configuration_name: name,
    },
  );

  if (res.status === 200) {
    const formatedData = data.credential.find(
      (item) => item.configuration_name === name,
    );
    formatedData.oauth_url = res.data?.oauth_url;
    formatedData.expiration = res.data?.expiration;

    await prisma.integration.update({
      where: {
        orgid_integration_name_unique: {
          orgId,
          name: IntegratedApps.waPayment,
        },
      },
      data: {
        credential: data.credential,
      },
    });
    return true;
  } else {
    log.error("Error regenerating wa config oauth link res => %o", res.data);
    throw new Error(res?.data?.data?.toString());
  }
};

export const createWaPaymentConfigurations = async (
  orgId: string,
  body: WaPaymentCreateSchema,
) => {
  const waSettings = await getWaSettings(orgId);

  const res = await callWhatsappApi(
    `/${waSettings.wabaId}/payment_configuration`,
    "POST",
    waSettings.accessToken,
    body,
  );
  if (res.status === 200) {
    log.trace("Payment configuration created in whatsapp");
    const configList = await getWaPaymentConfigurations(orgId, true);

    configList?.data?.forEach((item, i) => {
      item.payment_configurations.forEach((config) => {
        if (config.configuration_name === body?.configuration_name) {
          config.oauth_url = res?.data?.oauth_url;
          config.expiration = res?.data?.expiration;
        }
      });
    });

    const filteredConfigurations =
      configList?.data?.flatMap((item) => item?.payment_configurations) || [];

    await prisma.integration.upsert({
      where: {
        orgid_integration_name_unique: {
          orgId,
          name: IntegratedApps.waPayment,
        },
      },
      update: {
        credential: filteredConfigurations,
      },
      create: {
        credential: filteredConfigurations,
        name: IntegratedApps.waPayment,
        orgId,
      },
    });
    return true;
  } else {
    log.error(
      "Error creating payment configurations in whatsapp res => %o",
      res.data,
    );
    return false;
  }
};

export const deleteWaPaymentConfiguration = async (
  orgId: string,
  name: string,
) => {
  const wa_payment_configuration: any = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: IntegratedApps.waPayment,
      },
    },
  });
  if (!wa_payment_configuration) throw new Error("No Configurations Found");
  const waSettings = await getWaSettings(orgId);
  const res = await callWhatsappApi(
    `/${waSettings.wabaId}/payment_configuration`,
    "DELETE",
    waSettings.accessToken,
    {
      configuration_name: name,
    },
  );

  if (res.status === 200) {
    await getWaPaymentConfigurations(orgId);
  }
  return;
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
