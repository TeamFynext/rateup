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

// isPublished was in the select list but not in the where, so a draft was
// fully readable by anyone holding the short id — its name, its theme and every
// link on it. The short id is minted at creation, so it resolves from the
// moment the row exists; a campaign prepared ahead of a launch was visible to
// anyone who learned it early. The flag was returned to the client, which puts
// the decision in the component that cannot enforce it: the API has already
// sent the content. See issues.txt 45.2.
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

// This used to walk the org outwards — org -> members -> user -> surveys —
// with no `where` at any level below the org. Survey has no required org: it
// hangs off createdBy, a User, and a User may be a member of any number of
// organisations (OrgMember is unique on (userId, orgId), not on userId). So
// `user.surveys` was every survey that person had ever created, in any
// organisation, and the dropdown handed a member of org A the survey ids and
// titles belonging to org B along with the name and tags of every team each was
// mapped to. Anyone in two organisations at once — an agency operator, a
// consultant, someone who moved between customers and was never removed —
// triggered it just by opening the page.
//
// Surveys are queried through teams here, the way getSurveysByUserId does
// (survey.service.ts), with the survey's own orgId accepted as well because
// Survey.orgId is nullable and older rows carry it on the teams alone.
// See issues.txt 45.1.
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
    // Was silently an empty array, which made a typo indistinguishable from
    // "this organisation has no surveys". See issues.txt 45.6.
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

// The click counter reads the whole links array, increments one entry and
// writes the array back. Two consequences: concurrent clicks both read N and
// both write N+1, so the pair registers as one; and, worse, the write is the
// array as it was a moment earlier, so a click overlapping an owner's
// `PUT /api/linktrees` — which also writes links wholesale — reverted that
// edit, with no error to either party. The click path is unauthenticated, so
// the timing is not something the organisation controls.
//
// The write is conditional on the array still being what was read, and retried
// when it is not. That makes a lost click a retried click, and makes an
// overlapping owner edit win rather than be silently undone. Moving click
// counts out of the JSON column is the real fix and needs a schema change.
// See issues.txt 45.4.
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
    // Was a bare update, which raises P2025 for a short id that does not exist
    // — the ordinary case for a page that has since been deleted — and nothing
    // caught it, so an unauthenticated caller could make the API answer 500.
    // See issues.txt 45.5.
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
      // Array.isArray rather than a truthiness test: links is Json, so a
      // non-array value can reach here and `.find` would throw a TypeError that
      // asyncErrHandler reports as a 500. See issues.txt 45.5.
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
