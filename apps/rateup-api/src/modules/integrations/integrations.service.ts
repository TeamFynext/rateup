import prisma from "../../utils/prisma";
import { callWaAmeliaApi } from "./integration_axios";
import { IntegrationSchema } from "./integrations.schema";

export const getAllIntegrations = (orgId: string) => {
  return prisma.integration.findMany({
    where: {
      orgId,
    },
  });
};

export const getIntegrationByName = async (orgId: string, name: string) => {
  const data = prisma.integration.findMany({
    where: {
      orgId,
      name,
    },
  });
  return data;
};

export const createIntegration = (orgId: string, data: IntegrationSchema) => {
  return prisma.integration.create({
    data: {
      name: data.name,
      credential: data.credential,
      orgId,
    },
  });
};

export const updateIntegrationById = (id: string, data: IntegrationSchema) => {
  return prisma.integration.update({
    where: {
      id,
    },
    data,
  });
};

export const deleteIntegrationById = (id: string) => {
  return prisma.integration.delete({
    where: {
      id,
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
