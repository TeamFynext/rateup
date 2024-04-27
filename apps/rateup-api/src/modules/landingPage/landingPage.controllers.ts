import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLandingPageInDB,
  deleteLandingPageInDB,
  generateAndGetOptionsFromDB,
  getAllLandingPagesFromDB,
  getLandingPageWithShortIdFromDB,
  getPublicLandingPageWithShortIdFromDB,
  updateLandingPageWithShortIdInDB,
  updatePageVisitOrLinkClickInDB,
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

enum ResourceToBeUpdated {
  LinkClick = "link-click",
  PageVisit = "page-visit",
}
// resourceToBeUpdated value will be "page-visit" or "link-click".
async function updatePageVisitsOrLinkClicks(
  req: FastifyRequest<{
    Params: { shortUrlId: string };
    Body: { resourceToBeUpdated: ResourceToBeUpdated; linkId?: string };
  }>,
  rep: FastifyReply,
) {
  const { resourceToBeUpdated, linkId = null } = req.body;
  if (resourceToBeUpdated === ResourceToBeUpdated.LinkClick && !linkId) {
    rep.code(400).send({
      success: false,
      message: "linkId field is required in the request body.",
    });
  } else {
    const resultObj = await updatePageVisitOrLinkClickInDB(req);
    if (resultObj) {
      rep.code(200).send({
        success: true,
        message: "Updated button click successfully.",
      });
    } else {
      rep.code(400).send({
        success: false,
        message: "Link with given linkId not found.",
      });
    }
  }
}

export {
  getLandingPages,
  getLandingPageWithShortId,
  getPublicLandingPageWithShortId,
  createLandingPage,
  updateLandingPageWithShortId,
  deleteLandingPageById,
  getLinkTypeDropdownOptions,
  updatePageVisitsOrLinkClicks,
};
