import { google } from "googleapis";
import { IntegratedApps } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";
import type { Integration as PrismaIntegration } from "../../../generated/prisma/client.js";
import { callWaAmeliaApi } from "./integration_axios.js";
import {
  IntegrationSchema,
  UpdateIntgrationInput,
  WaPaymentCreateSchema,
} from "./integrations.schema.js";
import { callMetaApi } from "../whatsapp/wa_axios.js";
import { log } from "../../utils/logger.js";
import { getWaSettings, getWaSettingsById } from "../whatsapp/settings/wa_settings.service.js";
import { sendWhatsAppTemplateToCustomer } from "./shopify/shopify.service.js";
import { getUniqueRandomAlphaId } from "../../utils/misc/random.utils.js";
import { getScheduleTime } from "../../utils/date.js";
import { generateApiKey } from "../apiAccessToken/apiAccessToken.service.js";
import axios from "axios";

// Shape of a single entry in Meta's payment_configurations API responses (both the
// list endpoint and the by-name/oauth-regeneration endpoints reuse this same shape).
interface WaPaymentConfigurationItem {
  configuration_name: string;
  oauth_url?: string;
  expiration?: string;
  [key: string]: unknown;
}

interface WaPaymentConfigurationGroup {
  payment_configurations: WaPaymentConfigurationItem[];
}

/**
 * The waPayment integration row, whose `credential` column holds the list of Meta payment
 * configurations rather than an OAuth blob like the other providers.
 */
type WaPaymentIntegration = Omit<PrismaIntegration, "credential"> & {
  credential: WaPaymentConfigurationItem[] | null;
};

/** Reads the waPayment row's credential at the single DB boundary. */
function asWaPaymentIntegration(
  integration: PrismaIntegration | null,
): WaPaymentIntegration | null {
  return integration as WaPaymentIntegration | null;
}

// Raw envelope returned by Meta's payment_configurations list endpoint (as opposed to
// the DB row returned when getWaPaymentConfigurations persists the result instead).
interface WaPaymentConfigurationsRawResponse {
  data?: WaPaymentConfigurationGroup[];
}

export const getAllIntegrationsByOrgId = (orgId: string) => {
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

export function getWaPaymentConfigurations(
  orgId: string,
  noDbSave: true,
  whatsappSettingsId?: string,
): Promise<WaPaymentConfigurationsRawResponse>;
export function getWaPaymentConfigurations(
  orgId: string,
  noDbSave?: false,
  whatsappSettingsId?: string,
): Promise<Awaited<ReturnType<typeof prisma.integration.upsert>>>;
export async function getWaPaymentConfigurations(
  orgId: string,
  noDbSave = false,
  whatsappSettingsId?: string,
) {
  // If a specific WA account is requested, use it. Otherwise fall back to the first account.
  const waSettings = whatsappSettingsId
    ? await getWaSettingsById(whatsappSettingsId, orgId)
    : await getWaSettings(orgId);

  if (!waSettings) {
    throw new Error("WhatsApp settings not found");
  }

  const res = await callMetaApi(
    `/${waSettings.wabaId}/payment_configurations`,
    "GET",
    waSettings.accessToken,
  );
  if (res.status !== 200) {
    log.error("Error getting wa payment configurations => %o", res.data);
    throw new Error("Error creating template in whatsapp");
  }
  if (noDbSave) return res?.data;

  const responseGroups: WaPaymentConfigurationGroup[] = res?.data?.data ?? [];
  const filteredConfigurations = responseGroups.flatMap((item) => item?.payment_configurations);
  const waPayment = asWaPaymentIntegration(
    await getIntegrationByName(orgId, IntegratedApps.waPayment),
  );
  const mapedData = filteredConfigurations.map((itemA) => {
    const matchingItemB = waPayment?.credential?.find(
      (itemB) => itemB.configuration_name === itemA.configuration_name,
    );
    return matchingItemB
      ? {
          ...itemA,
          oauth_url: matchingItemB?.oauth_url,
          expiration: matchingItemB?.expiration,
        }
      : itemA;
  });
  const data = await prisma.integration.upsert({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: IntegratedApps.waPayment,
      },
    },
    create: {
      orgId,
      name: IntegratedApps.waPayment,
      credential: mapedData,
    },
    update: {
      credential: mapedData,
    },
  });
  return data;
}

export const getWaPaymentConfigByName = async (orgId: string, name: string) => {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error("WhatsApp settings not found");
  }
  const res = await callMetaApi(
    `/${waSettings.wabaId}/payment_configuration/${name}`,
    "GET",
    waSettings.accessToken,
  );

  if (res.status === 200) {
    const mappedData = res?.data?.data || [];
    if (mappedData?.length === 0) throw new Error(`No config ${name} found`);

    await prisma.integration.upsert({
      where: {
        orgid_integration_name_unique: {
          orgId,
          name: IntegratedApps.waPayment,
        },
      },
      create: {
        orgId,
        name: IntegratedApps.waPayment,
        credential: mappedData,
      },
      update: {
        credential: mappedData,
      },
    });
    return true;
  } else {
    log.error("Error getting wa config by name res => %o", res.data);
    throw new Error(res?.data?.data?.toString());
  }
};

export const getRegenerateWaPaymentConfigOauth = async (orgId: string, name: string) => {
  const data = asWaPaymentIntegration(
    await prisma.integration.findUnique({
      where: {
        orgid_integration_name_unique: {
          orgId,
          name: IntegratedApps.waPayment,
        },
      },
    }),
  );
  if (!data) throw new Error("No integration found");
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error("WhatsApp settings not found");
  }
  const res = await callMetaApi(
    `/${waSettings.wabaId}/generate_payment_configuration_oauth_link`,
    "POST",
    waSettings.accessToken,
    {
      configuration_name: name,
    },
  );

  if (res.status === 200) {
    const formatedData = data?.credential?.find((item) => item.configuration_name === name);
    if (!formatedData) {
      throw new Error(`WhatsApp payment configuration "${name}" not found for org ${orgId}`);
    }
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
        credential: data?.credential ?? [],
      },
    });
    return true;
  } else {
    log.error("Error regenerating wa config oauth link res => %o", res.data);
    throw new Error(res?.data?.data?.toString());
  }
};

export const createWaPaymentConfigurations = async (orgId: string, body: WaPaymentCreateSchema) => {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error("WhatsApp settings not found");
  }

  const res = await callMetaApi(
    `/${waSettings.wabaId}/payment_configuration`,
    "POST",
    waSettings.accessToken,
    body,
  );
  if (res.status === 200) {
    log.trace("Payment configuration created in whatsapp");
    const configList = await getWaPaymentConfigurations(orgId, true);

    configList?.data?.forEach((item) => {
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
    log.error("Error creating payment configurations in whatsapp res => %o", res.data);
    return false;
  }
};

export const deleteWaPaymentConfiguration = async (orgId: string, name: string) => {
  const wa_payment_configuration = asWaPaymentIntegration(
    await prisma.integration.findUnique({
      where: {
        orgid_integration_name_unique: {
          orgId,
          name: IntegratedApps.waPayment,
        },
      },
    }),
  );
  if (!wa_payment_configuration) throw new Error("No Configurations Found");
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error("WhatsApp settings not found");
  }
  const res = await callMetaApi(
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

export const createIntegration = async (data: IntegrationSchema, orgId?: string) => {
  let apikey;
  if (data.name === IntegratedApps.zapier) {
    const { key, hash } = await generateApiKey();
    data.credential = {
      ...data?.credential,
      accessToken: hash,
    };
    apikey = key;
  }
  const integration = await prisma.integration.create({
    data: {
      name: data.name,
      credential: data.credential,
      orgId: orgId ?? undefined,
    },
  });

  return { ...integration, apikey };
};

export const updateIntegrationByName = async (
  orgId: string,
  name: string,
  data: UpdateIntgrationInput,
) => {
  let apikey;
  if (name === IntegratedApps.zapier && data.updateKey) {
    if (!data.credential) {
      throw new Error("Missing credential to regenerate the zapier access token");
    }
    const { key, hash } = await generateApiKey();
    data.credential.accessToken = hash;
    apikey = key;
  }
  const {
    updateKey: _ignoredUpdateKey,
    orgId: _ignoredOrgId,
    ...rest
  } = data as UpdateIntgrationInput & { orgId?: string };
  const integration = await prisma.integration.update({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name,
      },
    },
    data: {
      ...rest,
    },
  });
  return { ...integration, apikey };
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
  extras?: Array<string | number>;
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

export async function removeSurveySpreadSheetSheetId(orgId: string) {
  await prisma.survey.updateMany({
    where: {
      orgId,
    },
    data: {
      spreadSheetId: null,
    },
  });
}

export async function getIntegrationByPetPoojaRestaurantId(restaurantId: string) {
  return (await prisma.integration.findFirst({
    where: {
      credential: {
        path: ["restaurantId"],
        equals: restaurantId,
      },
    },
  })) as unknown as petPoojaIntegration;
}

export async function sendPetpoojaWaTemplateCronAction() {
  try {
    const currentTime = new Date();
    const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60000);

    const integrations = (await prisma.integration.findMany({
      where: {
        name: IntegratedApps.petpooja,
      },
    })) as unknown as petPoojaIntegration[];

    if (!integrations.length) return;

    const history = integrations.flatMap((integration) => {
      const history = integration.credential.history;
      return history
        ? history.map((hist) => ({
            ...hist,
            orgId: integration.orgId,
            ...integration.credential.orderEvent,
          }))
        : [];
    });
    if (!history.length) return;

    const schedules = history.filter(
      (hist) =>
        hist.status === "SCHEDULED" &&
        hist.scheduledAt !== undefined &&
        new Date(hist.scheduledAt) <= fiveMinutesLater,
    );

    if (!schedules.length) return;

    for (const schedule of schedules) {
      const res = await sendWhatsAppTemplateToCustomer(
        schedule.orgId,
        schedule.phone,
        schedule.waTemplateId,
        schedule.teamId,
        schedule.name,
      );
      const integration = integrations.find((integration) => integration.orgId === schedule.orgId);
      if (!integration) {
        log.error("Petpooja integration not found for org %s", schedule.orgId);
        continue;
      }
      const newHistory = [...(integration.credential.history ?? [])];
      newHistory.forEach((hist) => {
        if (hist.id === schedule.id)
          hist.status = res ? (res.status ? "SENT" : `FAILED: ${res?.message}`) : "FAILED";
      });
      await updateIntegrationByName(integration.orgId, IntegratedApps.petpooja, {
        credential: { ...integration.credential, history: newHistory },
      });
    }
  } catch (e) {
    log.error(e);
  }
}

export async function sendWaTemplateOnPetpoojaOrder(
  integration: petPoojaIntegration,
  customer: { name: string; phone: string },
) {
  const { waTemplateId, teamId, timeDelay } = integration.credential.orderEvent;
  const history = integration.credential.history ?? [];
  const existingIds = history.map((hist) => hist.id);
  const newHistory = {
    id: getUniqueRandomAlphaId(6, existingIds),
    name: customer.name,
    phone: customer.phone,
    createdAt: new Date(),
  };
  if (timeDelay) {
    history.push({
      ...newHistory,
      status: "SCHEDULED",
      scheduledAt: getScheduleTime(timeDelay, new Date()),
    });
  } else {
    const res = await sendWhatsAppTemplateToCustomer(
      integration.orgId,
      customer.phone,
      waTemplateId,
      teamId,
      customer.name,
    );
    history.push({
      ...newHistory,
      status: res ? (res.status ? "SENT" : `FAILED: ${res?.message}`) : "FAILED",
    });
  }
  await updateIntegrationByName(integration.orgId, IntegratedApps.petpooja, {
    credential: { ...integration.credential, history },
  });
}

export async function deleteZapierTriggerHooks(
  data: ZapierIntegration["credential"]["triggerSubscriptions"][0],
  orgId: string,
) {
  const integration = (await getIntegrationByName(
    orgId,
    IntegratedApps.zapier,
  )) as unknown as ZapierIntegration;
  const subscriptions = integration?.credential?.triggerSubscriptions ?? [];
  const stored = subscriptions.find((t) => t.hookUrl === data.hookUrl);
  if (!stored) {
    log.warn("No zapier trigger subscription matching the requested hook for org %s", orgId);
    return;
  }

  if (stored.active) {
    await axios.delete(stored.hookUrl);
  }
  const credential = {
    ...integration.credential,
    triggerSubscriptions: subscriptions.filter((t) => t.hookUrl !== stored.hookUrl),
  } as ZapierIntegration["credential"];
  await updateIntegrationByName(orgId, IntegratedApps.zapier, { credential });
}
