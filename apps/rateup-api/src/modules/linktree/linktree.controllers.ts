import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLinktreeInDB,
  deleteLinktreeInDB,
  generateAndGetOptionsFromDB,
  getAllLinktreesFromDB,
  getLinktreeWithShortIdFromDB,
  getPublicLinktreeWithShortIdFromDB,
  updateLinktreeWithShortIdInDB,
  updatePageVisitOrLinkClickInDB,
} from "./linktree.service.js";
import { shortIdUniqueConstraintErrHandler } from "../../utils/commonUtils.js";
import { CreateLinktreeReqBody } from "./linktree.schema.js";

async function getLinktrees(req: FastifyRequest, rep: FastifyReply) {
  const allLinktreesArray = await getAllLinktreesFromDB(req);
  rep.code(200).send(allLinktreesArray);
}

async function getLinktreeWithShortId(
  req: FastifyRequest<{ Params: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  const linktreeWithShortUrlId = await getLinktreeWithShortIdFromDB(req);
  if (linktreeWithShortUrlId) {
    rep.code(200).send(linktreeWithShortUrlId);
  } else {
    rep.code(404).send("Linktree with requested shortId not found.");
  }
}

async function getPublicLinktreeWithShortId(
  req: FastifyRequest<{ Params: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  const linktreeWithShortUrlId = await getPublicLinktreeWithShortIdFromDB(req);
  rep.code(200).send(linktreeWithShortUrlId);
}

async function createLinktree(
  req: FastifyRequest<{ Body: CreateLinktreeReqBody }>,
  rep: FastifyReply,
) {
  const newLinktree = await shortIdUniqueConstraintErrHandler(() => createLinktreeInDB(req));
  rep.code(201).send(newLinktree);
}

async function updateLinktreeWithShortId(
  req: FastifyRequest<{ Body: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  const updatedLinktree = await updateLinktreeWithShortIdInDB(req);
  rep.code(200).send(updatedLinktree);
}

async function deleteLinktreeById(
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply,
) {
  await deleteLinktreeInDB(req);
  rep.code(200).send({ success: true, message: "Deleted Linktree sucessfully." });
}

async function getLinkTypeDropdownOptions(
  req: FastifyRequest<{ Params: { linkType: string } }>,
  rep: FastifyReply,
) {
  // create array of dropdown options data from surveys for Linktree in frontend.
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
  getLinktrees,
  getLinktreeWithShortId,
  getPublicLinktreeWithShortId,
  createLinktree,
  updateLinktreeWithShortId,
  deleteLinktreeById,
  getLinkTypeDropdownOptions,
  updatePageVisitsOrLinkClicks,
};
