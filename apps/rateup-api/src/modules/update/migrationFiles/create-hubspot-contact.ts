import { hubApiClient } from "../../../utils/hubspot";
import prisma from "../../../utils/prisma";

export async function createHubSpotContactsForExistingRecords() {
  const orgs = await prisma.org.findMany({
    include: {
      members: true,
      owner: {
        select: {
          email: true,
        },
      },
    },
  });

  const users = await prisma.user.findMany({
    include: {
      orgMember: {
        include: {
          org: {
            select: {
              name: true,
              owner: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const existingContacts = (await hubApiClient.get(`/crm/v3/objects/contacts`))
    .data;

  const remainingContacts = users.filter(
    (user) =>
      !existingContacts.results
        .map((contact) => contact.properties.email)
        .includes(user.email),
  );

  if (!remainingContacts.length)
    return { message: "all data already exported" };

  const userInput = remainingContacts.map((user) => ({
    properties: {
      firstname: user.name,
      email: user.email,
      phone: user.phone ?? undefined,
      company: user.orgMember[0].org.name,
      joined_date: user.createdAt,
    },
  }));

  const contacts = (
    await hubApiClient.post(`/crm/v3/objects/contacts/batch/create`, {
      inputs: userInput,
    })
  ).data;

  const orgInput = orgs.map((org) => ({
    properties: {
      name: org.name,
      joined_date: org.createdAt,
      owner_email: org.owner.email,
    },
  }));

  const companies = (
    await hubApiClient.post(`/crm/v3/objects/companies/batch/create`, {
      inputs: orgInput,
    })
  ).data;

  const associateInput = contacts.results.map((contact) => {
    const orgOwnerEmail = users.find(
      (user) => user.email === contact.properties.email,
    ).orgMember[0].org.owner.email;
    const company = companies.results.find(
      (company) => company.properties.owner_email === orgOwnerEmail,
    );
    return {
      types: [
        {
          associationCategory: "HUBSPOT_DEFINED",
          associationTypeId: 279,
        },
      ],
      from: {
        id: contact.id,
      },
      to: {
        id: company.id,
      },
    };
  });

  const associate = await hubApiClient.post(
    `/crm/v4/associations/contacts/companies/batch/create`,
    {
      inputs: associateInput,
    },
  );
  return { message: "Data exported" };
}
