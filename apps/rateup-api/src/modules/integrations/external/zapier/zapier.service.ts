import { faker } from "@faker-js/faker";
import { randomUUID } from "crypto";
import { zapierTriggerQueue } from "../../../../utils/redisConnection";

export enum ZapierTriggers {
  CONTACT_CREATE = "new_contact_create",
  CONTACT_ASSIGN = "new_contact_assignee",
}

export async function getSampleContacts(orgId) {
  return [
    {
      id: randomUUID(),
      name: faker.person.fullName(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      source: "whatsapp",
    },
    {
      id: randomUUID(),
      name: faker.person.fullName(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      source: "manual",
    },
  ];
}

export async function addZapierTriggerToQueue(
  name: ZapierTriggers,
  data,
  orgId,
) {
  await zapierTriggerQueue.add(name, { data, orgId });
}
