import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../../utils/logger.js";
import { dataExtractFileMimeTypes } from "../../../fileUpload/fileUpload.schema.js";
import { importCSVContacts } from "../customer.service.js";
import {
  ByCustomerGroupIdParams,
  PaginationQuery,
} from "./customerGroup.schema.js";
import { getCustomersByContactGroupIdWithPagination } from "./customerGroup.service.js";

export async function addNewCustomersfromCSVToGroupHandler(
  request: FastifyRequest<{ Params: ByCustomerGroupIdParams }>,
  reply: FastifyReply,
) {
  try {
    const file = await request.file();
    const { orgId } = request.user;
    const customerGroupId = request.params.contactGroupId;
    if (!dataExtractFileMimeTypes.includes(file?.mimetype))
      return reply
        .code(400)
        .send({ error: "This file type is not permitted." });
    const tags = [];
    let update = false;
    for (const key in file?.fields) {
      if (key.startsWith("tags[")) {
        tags.push(file?.fields?.[key]?.["value"]);
      } else if (key === "update") {
        update = file?.fields?.[key]?.["value"] === "true";
      }
    }
    const res: any = await importCSVContacts(
      file,
      orgId,
      tags,
      update,
      customerGroupId,
    );
    if (res.status === "error") {
      return reply.code(400).send({ error: "VALIDATION_ERR", data: res.data });
    }
    reply.code(200).send(res);
  } catch (err) {
    log.error(err);
    reply.code(500).send({ error: err?.message || "Something went wrong" });
  }
}

export async function getCustomersByContactGroupIdHandler(
  request: FastifyRequest<{
    Params: ByCustomerGroupIdParams;
    Querystring: PaginationQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const contacts = await getCustomersByContactGroupIdWithPagination(
      request.params.contactGroupId,
      request.query,
    );
    reply.code(200).send(contacts);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}
