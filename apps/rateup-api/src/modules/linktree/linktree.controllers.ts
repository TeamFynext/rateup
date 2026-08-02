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
import { UnknownLinkTypeError } from "./linktree.service.js";
import connection from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";

/** The one 404 body shape for this module. */
const notFoundBody = {
  success: false,
  message: "Linktree with requested shortId not found.",
};

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
    // Was a bare string, where every other error in the module is an object.
    // See issues.txt 45.6.
    rep.code(404).send(notFoundBody);
  }
}

async function getPublicLinktreeWithShortId(
  req: FastifyRequest<{ Params: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  const linktreeWithShortUrlId = await getPublicLinktreeWithShortIdFromDB(req);
  // The public read used to send the service's null with a 200, so a client had
  // to test the body rather than the status, and anything treating a 2xx as
  // success read a deleted page as a live one. It is also the response for an
  // unpublished draft now (45.2) — deliberately indistinguishable from a page
  // that does not exist, so the endpoint does not report drafts into existence.
  // See issues.txt 45.6.
  if (!linktreeWithShortUrlId) {
    rep.code(404).send(notFoundBody);
    return;
  }
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
  try {
    const optionsArray = await generateAndGetOptionsFromDB(req);
    rep.code(200).send(optionsArray);
  } catch (error) {
    if (error instanceof UnknownLinkTypeError) {
      rep.code(400).send({ success: false, message: error.message });
      return;
    }
    throw error;
  }
}

enum ResourceToBeUpdated {
  LinkClick = "link-click",
  PageVisit = "page-visit",
}
// One visit (or one click on a given link) per address per page per day. The
// counters are unauthenticated by design — a visitor has no session — so
// without this anyone holding an eight-character short id could raise another
// organisation's visitor count and any link's click count without bound, and
// they are the only measure the product offers of whether a link page worked.
// Fails open: a Redis outage should not stop counting. See issues.txt 45.3.
async function alreadyCountedToday(ip: string, shortUrlId: string, what: string) {
  try {
    const key = `linktree:${what}:${shortUrlId}:${ip}`;
    const first = await connection.set(key, "1", "EX", 86_400, "NX");
    return first === null;
  } catch (error) {
    log.error({ err: error, shortUrlId }, "Linktree count dedup check failed; counting it");
    return false;
  }
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
    return;
  }

  const what = linkId ? `click:${linkId}` : "visit";
  if (await alreadyCountedToday(req.ip || "unknown", req.params.shortUrlId, what)) {
    // Answered the same way as a counted one: whether this address has been
    // seen today is not the caller's business.
    rep.code(200).send({
      success: true,
      message: "Updated button click successfully.",
    });
    return;
  }

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
