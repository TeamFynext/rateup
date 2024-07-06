import { FastifyRequest } from "fastify";
import prisma from "../../utils/prisma";
import { getShortUrlId } from "../../utils/commnUtils";
import { CreateLandingPageReqBody } from "./landingPage.schema";

async function createLandingPageInDB(
  req: FastifyRequest<{ Body: CreateLandingPageReqBody }>,
) {
  const {
    body: { name },
    user: { orgId, userId },
  } = req;

  const newShortUrlId = getShortUrlId();

  const newLandingPage = await prisma.landingPage.create({
    data: {
      name,
      ownerOrgId: orgId,
      createdById: userId,
      shortUrlId: newShortUrlId,
    },
  });

  return newLandingPage;
}

async function getAllLandingPagesFromDB(req: FastifyRequest) {
  const {
    user: { orgId },
  } = req;
  const allLandingPagesArray = await prisma.landingPage.findMany({
    where: {
      ownerOrgId: orgId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return allLandingPagesArray;
}

async function getLandingPageWithShortIdFromDB(req) {
  const { shortUrlId } = req.params;
  const {
    user: { orgId },
  } = req;
  const landingPage = await prisma.landingPage.findFirst({
    where: {
      shortUrlId,
      ownerOrgId: orgId,
    },
  });
  return landingPage;
}

async function getPublicLandingPageWithShortIdFromDB(req) {
  const { shortUrlId } = req.params;
  const {
    user: { orgId },
  } = req;
  const landingPage = await prisma.landingPage.findFirst({
    where: {
      shortUrlId,
      ownerOrgId: orgId,
    },
    select: {
      name: true,
      shortUrlId: true,
      theme: true,
      links: true,
      isPublished: true,
    },
  });
  return landingPage;
}

async function updateLandingPageWithShortIdInDB(req) {
  const {
    body: { shortUrlId, ...rest },
  } = req;
  const {
    user: { orgId },
  } = req;
  const updatedLandingPage = await prisma.landingPage.update({
    where: {
      shortUrlId,
      ownerOrgId: orgId,
    },
    data: {
      ...rest,
    },
  });
  return updatedLandingPage;
}

async function deleteLandingPageInDB(req) {
  const {
    user: { orgId },
  } = req;
  const deletedLandingPage = await prisma.landingPage.delete({
    where: {
      id: req.params.id,
      ownerOrgId: orgId,
    },
  });
  return deletedLandingPage;
}

async function generateAndGetOptionsFromDB(
  req: FastifyRequest<{ Params: { linkType: string } }>,
) {
  const {
    params: { linkType },
    user: { orgId: requestedUserOrgId },
  } = req;

  const data = await prisma.org.findFirst({
    where: {
      id: requestedUserOrgId,
    },
    include: {
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
    },
  });

  const arrayOfArrayOfSurveysCreatedByUser = data.members.map(({ user }) => {
    return user.surveys;
  });

  // resultArr is survey title and type, SurveyTeamMap table's shortUrlId and team name,
  const resultArr = [];
  arrayOfArrayOfSurveysCreatedByUser.forEach((surveysCreatedByUsrArr) => {
    let linkTypeInDB;
    if (linkType === "web-survey") linkTypeInDB = "web";
    else if (linkType === "whatsapp-survey") linkTypeInDB = "waFlow";

    surveysCreatedByUsrArr.forEach((surveyObj) => {
      const { id, title, teams, type } = surveyObj;
      if (type === linkTypeInDB)
        resultArr.push({ id, title, teams, type: linkType });
    });
  });

  return resultArr;
}

async function updatePageVisitOrLinkClickInDB(req) {
  const {
    params: { shortUrlId },
    body: { resourceToBeUpdated, linkId },
  } = req;
  const {
    user: { orgId },
  } = req;
  if (resourceToBeUpdated === "page-visit") {
    const updatedRecord = await prisma.landingPage.update({
      where: {
        shortUrlId,
        ownerOrgId: orgId,
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
    const { links }: { links: any } = await prisma.landingPage.findFirst({
      where: {
        shortUrlId,
        ownerOrgId: orgId,
      },
      select: {
        links: true,
      },
    });
    if (
      links &&
      links.length &&
      links.find((linkObj) => linkObj.id === linkId)
    ) {
      const newLinks = links.map((linkObj, index) => {
        const { noOfClicks = 0 } = linkObj;
        if (linkObj.id === linkId) {
          return {
            ...linkObj,
            noOfClicks: noOfClicks + 1,
          };
        } else {
          return linkObj;
        }
      });

      const updatedLandingPageObj = await prisma.landingPage.update({
        where: {
          shortUrlId,
          ownerOrgId: orgId,
        },
        data: {
          links: newLinks,
        },
      });

      return updatedLandingPageObj;
    } else {
      return null;
    }
  }
}

export {
  createLandingPageInDB,
  getAllLandingPagesFromDB,
  getLandingPageWithShortIdFromDB,
  getPublicLandingPageWithShortIdFromDB,
  updateLandingPageWithShortIdInDB,
  deleteLandingPageInDB,
  generateAndGetOptionsFromDB,
  updatePageVisitOrLinkClickInDB,
};
