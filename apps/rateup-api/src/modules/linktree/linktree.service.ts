import { FastifyRequest } from "fastify";
import prisma from "../../utils/prisma.js";
import { getShortUrlId } from "../../utils/commonUtils.js";
import {
  CreateLinktreeReqBody,
  GetLinktreeWithShortIdParams,
  UpdateLinktreeReqBody,
  UpdatePageVisitsOrLinkClicksReqBody,
  UpdatePageVisitsOrLinkClicksReqParams,
} from "./linktree.schema.js";
import { Prisma } from "../../../generated/prisma/client.js";

async function createLinktreeInDB(req: FastifyRequest<{ Body: CreateLinktreeReqBody }>) {
  const {
    body: { name },
    user: { orgId, userId },
  } = req;

  // userId is absent for API-access-token-authenticated requests (see
  // global.d.ts's FastifyRequest.user), but createdById is a required column.
  if (!userId) {
    throw new Error("Cannot create a linktree without an authenticated user id.");
  }

  const newShortUrlId = getShortUrlId();

  const newLinktree = await prisma.linktree.create({
    data: {
      name,
      ownerOrgId: orgId,
      createdById: userId,
      shortUrlId: newShortUrlId,
    },
  });

  return newLinktree;
}

async function getAllLinktreesFromDB(req: FastifyRequest) {
  const {
    user: { orgId },
  } = req;
  const allLinktreesArray = await prisma.linktree.findMany({
    where: {
      ownerOrgId: orgId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return allLinktreesArray;
}

async function getLinktreeWithShortIdFromDB(
  req: FastifyRequest<{ Params: GetLinktreeWithShortIdParams }>,
) {
  const { shortUrlId } = req.params;
  const {
    user: { orgId },
  } = req;
  const linktree = await prisma.linktree.findFirst({
    where: {
      shortUrlId,
      ownerOrgId: orgId,
    },
  });
  return linktree;
}

async function getPublicLinktreeWithShortIdFromDB(
  req: FastifyRequest<{ Params: GetLinktreeWithShortIdParams }>,
) {
  const { shortUrlId } = req.params;
  const linktree = await prisma.linktree.findFirst({
    where: {
      shortUrlId,
    },
    select: {
      name: true,
      shortUrlId: true,
      theme: true,
      links: true,
      isPublished: true,
    },
  });
  return linktree;
}

async function updateLinktreeWithShortIdInDB(req: FastifyRequest<{ Body: UpdateLinktreeReqBody }>) {
  const {
    body: { shortUrlId, ...rest },
  } = req;
  const {
    user: { orgId },
  } = req;
  const updatedLinktree = await prisma.linktree.update({
    where: {
      shortUrlId,
      ownerOrgId: orgId,
    },
    data: {
      ...rest,
    },
  });
  return updatedLinktree;
}

async function deleteLinktreeInDB(req: FastifyRequest<{ Params: { id: string } }>) {
  const {
    user: { orgId },
  } = req;
  const deletedLinktree = await prisma.linktree.delete({
    where: {
      id: req.params.id,
      ownerOrgId: orgId,
    },
  });
  return deletedLinktree;
}

const linkTypeDropdownOrgInclude = {
  members: {
    include: {
      user: {
        include: {
          surveys: {
            include: {
              teams: {
                include: {
                  team: {
                    select: {
                      name: true,
                      tags: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrgInclude;

type SurveyForLinkTypeDropdown = Prisma.OrgGetPayload<{
  include: typeof linkTypeDropdownOrgInclude;
}>["members"][number]["user"]["surveys"][number];

interface LinkTypeDropdownOption {
  id: string;
  title: string;
  teams: SurveyForLinkTypeDropdown["teams"];
  type: string;
}

async function generateAndGetOptionsFromDB(req: FastifyRequest<{ Params: { linkType: string } }>) {
  const {
    params: { linkType },
    user: { orgId: requestedUserOrgId },
  } = req;

  const data = await prisma.org.findFirst({
    where: {
      id: requestedUserOrgId,
    },
    include: linkTypeDropdownOrgInclude,
  });

  if (!data) {
    throw new Error(`Org not found for id: ${requestedUserOrgId}`);
  }

  const arrayOfArrayOfSurveysCreatedByUser = data.members.map(({ user }) => {
    return user.surveys;
  });

  // resultArr is survey title and type, SurveyTeamMap table's shortUrlId and team name,
  const resultArr: LinkTypeDropdownOption[] = [];
  arrayOfArrayOfSurveysCreatedByUser.forEach((surveysCreatedByUsrArr) => {
    let linkTypeInDB: string | undefined;
    if (linkType === "web-survey") linkTypeInDB = "web";
    else if (linkType === "whatsapp-survey") linkTypeInDB = "waFlow";

    surveysCreatedByUsrArr.forEach((surveyObj) => {
      const { id, title, teams, type } = surveyObj;
      if (type === linkTypeInDB) resultArr.push({ id, title, teams, type: linkType });
    });
  });

  return resultArr;
}

async function updatePageVisitOrLinkClickInDB(
  req: FastifyRequest<{
    Params: UpdatePageVisitsOrLinkClicksReqParams;
    Body: UpdatePageVisitsOrLinkClicksReqBody;
  }>,
) {
  const {
    params: { shortUrlId },
    body: { resourceToBeUpdated, linkId },
  } = req;
  if (resourceToBeUpdated === "page-visit") {
    await prisma.linktree.update({
      where: {
        shortUrlId,
      },
      data: {
        visitorsCount: {
          increment: 1,
        },
      },
    });
    return {
      success: true,
      message: "Updated visitor count successfully",
    };
  } else if (resourceToBeUpdated === "link-click") {
    const linktreeRecord = await prisma.linktree.findFirst({
      where: {
        shortUrlId,
      },
      select: {
        links: true,
      },
    });
    if (!linktreeRecord) {
      return null;
    }
    // The editor writes extra presentation fields per link; LinktreeLink names only what
    // the server touches (see the index signature) and carries the rest through.
    const links = linktreeRecord.links;
    if (links && links.length && links.find((linkObj) => linkObj.id === linkId)) {
      const newLinks = links.map((linkObj) => {
        const noOfClicks = Number(linkObj.noOfClicks ?? 0);
        if (linkObj.id === linkId) {
          return {
            ...linkObj,
            noOfClicks: noOfClicks + 1,
          };
        } else {
          return linkObj;
        }
      });

      const updatedLinktreeObj = await prisma.linktree.update({
        where: {
          shortUrlId,
        },
        data: {
          links: newLinks,
        },
      });

      return updatedLinktreeObj;
    } else {
      return null;
    }
  }
}

export {
  createLinktreeInDB,
  getAllLinktreesFromDB,
  getLinktreeWithShortIdFromDB,
  getPublicLinktreeWithShortIdFromDB,
  updateLinktreeWithShortIdInDB,
  deleteLinktreeInDB,
  generateAndGetOptionsFromDB,
  updatePageVisitOrLinkClickInDB,
};
