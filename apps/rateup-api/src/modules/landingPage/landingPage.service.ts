import { FastifyRequest } from "fastify";
import prisma from "../../utils/prisma.js";
import { getShortUrlId } from "../../utils/commonUtils.js";
import { CreateLandingPageReqBody } from "./landingPage.schema.js";

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
      tiptapEditorContent: "",
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
  const landingPage = await prisma.landingPage.findFirst({
    where: {
      shortUrlId,
    },
    select: {
      name: true,
      shortUrlId: true,
      isPublished: true,
      tiptapEditorContent: true,
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

async function updatePageVisitInDB(req) {
  const {
    params: { shortUrlId },
  } = req;
  const updatedRecord = await prisma.landingPage.update({
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
}

export {
  createLandingPageInDB,
  getAllLandingPagesFromDB,
  getLandingPageWithShortIdFromDB,
  getPublicLandingPageWithShortIdFromDB,
  updateLandingPageWithShortIdInDB,
  deleteLandingPageInDB,
  updatePageVisitInDB,
};
