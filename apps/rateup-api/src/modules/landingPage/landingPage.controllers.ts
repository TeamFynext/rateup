import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLandingPageInDB,
  deleteLandingPageInDB,
  generateAndGetOptionsFromDB,
  getAllLandingPagesFromDB,
  getLandingPageWithShortIdFromDB,
  getPublicLandingPageWithShortIdFromDB,
  updateLandingPageWithShortIdInDB,
} from "./landingPage.service";
import { shortIdUniqueConstraintErrHandler } from "../../utils/commnUtils";

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
  const landingPageWithShortUrlId =
    await getPublicLandingPageWithShortIdFromDB(req);
  rep.code(200).send(landingPageWithShortUrlId);
}

async function createLandingPage(req: FastifyRequest, rep: FastifyReply) {
  const newLandingPage = await shortIdUniqueConstraintErrHandler(
    createLandingPageInDB,
    req,
  );
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
  const deletedLandingPage = await deleteLandingPageInDB(req);
  rep
    .send(200)
    .send({ success: true, message: "Deleted LandingPage sucessfully." });
}

async function getLinkTypeDropdownOptions(
  req: FastifyRequest<{ Params: { linkType: string } }>,
  rep: FastifyReply,
) {
  // create array of dropdown options data from surveys for LandingPage in frontend.
  const optionsArray = await generateAndGetOptionsFromDB(req);
  rep.code(200).send(optionsArray);
}

export {
  getLandingPages,
  getLandingPageWithShortId,
  getPublicLandingPageWithShortId,
  createLandingPage,
  updateLandingPageWithShortId,
  deleteLandingPageById,
  getLinkTypeDropdownOptions,
};
