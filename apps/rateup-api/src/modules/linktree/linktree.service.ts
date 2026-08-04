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

/**
 * `Linktree.links` is a nullable Json column with no default, so a page that has never had a
 * link saved reads back as `null`. The response schema declares it as an array and every client
 * treats it as one, so a raw row failed serialization with "Response doesn't match the schema"
 * and the route answered 500 — which is every freshly created linktree, and any list containing
 * one. Normalised here so the stored null never reaches the wire.
 */
function withLinks<T extends { links: PrismaJson.PLinktreeLinks | null }>(linktree: T) {
  return { ...linktree, links: linktree.links ?? [] };
}

/** A :linkType the dropdown does not map, refused rather than answered empty. */
class UnknownLinkTypeError extends Error {
  constructor(linkType: string) {
    super(`Unknown link type: ${linkType}`);
    this.name = "UnknownLinkTypeError";
  }
}

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

  return withLinks(newLinktree);
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
  return allLinktreesArray.map(withLinks);
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
  // Null here means "not found" — the controller turns that into a 404.
  return linktree && withLinks(linktree);
}

async function getPublicLinktreeWithShortIdFromDB(
  req: FastifyRequest<{ Params: GetLinktreeWithShortIdParams }>,
) {
  const { shortUrlId } = req.params;
  const linktree = await prisma.linktree.findFirst({
    where: {
      shortUrlId,
      isPublished: true,
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
  return withLinks(updatedLinktree);
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

const linkTypeDropdownSurveySelect = {
  id: true,
  title: true,
  type: true,
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
} satisfies Prisma.SurveySelect;

type SurveyForLinkTypeDropdown = Prisma.SurveyGetPayload<{
  select: typeof linkTypeDropdownSurveySelect;
}>;

interface LinkTypeDropdownOption {
  id: string;
  title: string;
  teams: SurveyForLinkTypeDropdown["teams"];
  type: string;
}

const LINK_TYPE_TO_SURVEY_TYPE: Record<string, string> = {
  "web-survey": "web",
  "whatsapp-survey": "waFlow",
};

async function generateAndGetOptionsFromDB(req: FastifyRequest<{ Params: { linkType: string } }>) {
  const {
    params: { linkType },
    user: { orgId },
  } = req;

  const surveyType = LINK_TYPE_TO_SURVEY_TYPE[linkType];
  if (!surveyType) {
    throw new UnknownLinkTypeError(linkType);
  }

  const surveys = await prisma.survey.findMany({
    where: {
      type: surveyType,
      OR: [{ orgId }, { teams: { some: { team: { orgId } } } }],
    },
    select: linkTypeDropdownSurveySelect,
    orderBy: { createdAt: "desc" },
  });

  const resultArr: LinkTypeDropdownOption[] = surveys.map(({ id, title, teams }) => ({
    id,
    title,
    teams,
    type: linkType,
  }));

  return resultArr;
}

const CLICK_WRITE_ATTEMPTS = 3;

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
    const { count } = await prisma.linktree.updateMany({
      where: {
        shortUrlId,
      },
      data: {
        visitorsCount: {
          increment: 1,
        },
      },
    });
    if (count === 0) {
      return null;
    }
    return {
      success: true,
      message: "Updated visitor count successfully",
    };
  } else if (resourceToBeUpdated === "link-click") {
    for (let attempt = 0; attempt < CLICK_WRITE_ATTEMPTS; attempt++) {
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
      if (!Array.isArray(links) || !links.some((linkObj) => linkObj?.id === linkId)) {
        return null;
      }

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

      // Conditional on the array we read: `count === 0` means someone else —
      // another click, or the owner's editor — wrote it first, so this attempt
      // is discarded and the read is retried against what they wrote.
      const { count } = await prisma.linktree.updateMany({
        where: {
          shortUrlId,
          // The typed Json alias (PLinktreeLinks) does not satisfy Prisma's
          // InputJsonValue index-signature constraint, though the value is
          // exactly what was read out of the column.
          links: { equals: links as Prisma.InputJsonValue },
        },
        data: {
          links: newLinks,
        },
      });

      if (count > 0) {
        return {
          success: true,
          message: "Updated button click successfully.",
        };
      }
    }

    // Three attempts all lost the race. The click is dropped rather than
    // overwriting whatever won, which is the safe direction.
    return null;
  }
}

export {
  UnknownLinkTypeError,
  createLinktreeInDB,
  getAllLinktreesFromDB,
  getLinktreeWithShortIdFromDB,
  getPublicLinktreeWithShortIdFromDB,
  updateLinktreeWithShortIdInDB,
  deleteLinktreeInDB,
  generateAndGetOptionsFromDB,
  updatePageVisitOrLinkClickInDB,
};
