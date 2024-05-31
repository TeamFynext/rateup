import { FastifyRequest, FastifyReply } from "fastify";
import {
  AddNewContactsToGroupInput,
  ByContactGroupIdParams,
} from "../../../contact/contactGroup/contactGroup.schema";
import { addNewContactsToGroupHandler } from "../contact/internal-copy/contact/contactGroup/contactGroup.controller";

export async function extAddNewContactsToGroupHandler(
  request: FastifyRequest<{
    Params: ByContactGroupIdParams;
    Body: AddNewContactsToGroupInput;
  }>,
  reply: FastifyReply,
) {
  request.body.forEach((c) => (c.source = "external"));
  await addNewContactsToGroupHandler(request, reply);
}
