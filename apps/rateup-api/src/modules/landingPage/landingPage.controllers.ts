import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLandingPageInDB,
  deleteLandingPageInDB,
  getAllLandingPagesFromDB,
  getLandingPageWithShortIdFromDB,
  getPublicLandingPageWithShortIdFromDB,
  updateLandingPageWithShortIdInDB,
  updatePageVisitInDB,
} from "./landingPage.service.js";
import { shortIdUniqueConstraintErrHandler } from "../../utils/commonUtils.js";

async function getLandingPages(req: FastifyRequest, rep: FastifyReply) {
  const allLandingPagesArray = await getAllLandingPagesFromDB(req);
  rep.code(200).send(allLandingPagesArray);
}

async function getLandingPageWithShortId(
  req: FastifyRequest<{ Params: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  const landingPageWithShortUrlId = await getLandingPageWithShortIdFromDB(req);
  if (landingPageWithShortUrlId) {
    rep.code(200).send(landingPageWithShortUrlId);
  } else {
    rep.code(404).send("LandingPage with requested shortId not found.");
  }
}

async function getPublicLandingPageWithShortId(
  req: FastifyRequest<{ Params: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  const landingPageWithShortUrlId = await getPublicLandingPageWithShortIdFromDB(req);
  rep.code(200).send(landingPageWithShortUrlId);
}

async function createLandingPage(req: FastifyRequest, rep: FastifyReply) {
  const newLandingPage = await shortIdUniqueConstraintErrHandler(createLandingPageInDB, req);
  rep.code(201).send(newLandingPage);
}

async function updateLandingPageWithShortId(
  req: FastifyRequest<{ Body: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  const updatedLandingPage = await updateLandingPageWithShortIdInDB(req);
  rep.code(200).send(updatedLandingPage);
}

async function deleteLandingPageById(
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply,
) {
  await deleteLandingPageInDB(req);
  rep.code(200).send({ success: true, message: "Deleted LandingPage sucessfully." });
}

async function updatePageVisits(
  req: FastifyRequest<{
    Params: { shortUrlId: string };
  }>,
  rep: FastifyReply,
) {
  const resultObj = await updatePageVisitInDB(req);
  rep.code(200).send(resultObj);
}

export {
  getLandingPages,
  getLandingPageWithShortId,
  getPublicLandingPageWithShortId,
  createLandingPage,
  updateLandingPageWithShortId,
  deleteLandingPageById,
  updatePageVisits,
};
