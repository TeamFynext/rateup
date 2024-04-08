import { FastifyInstance } from "fastify";
import {
  addMultipleWaContactsHandler,
  getAllWaContactsByOrgHandler,
  getWaContactByWaContactIdHandler,
} from "./wacontact.controller";
import { $waContact } from "./wacontact.schema";
import { checkSession } from "../../../../utils/checkSession";

export async function waContactRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.post("/", addMultipleWaContactsHandler);
  server.get("/", getAllWaContactsByOrgHandler);
  server.get(
    "/:id",
    { schema: { params: $waContact("byId") } },
    getWaContactByWaContactIdHandler,
  );
}
