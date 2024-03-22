import { FastifyInstance } from "fastify";
import {
  addMultipleWaContactsHandler,
  getAllWaContactsByOrgHandler,
  getWaContactByWaContactIdHandler,
} from "./wacontact.controller";
import { $waContact } from "./wacontact.schema";

export async function waContactRoutes(server: FastifyInstance) {
  server.post("/", addMultipleWaContactsHandler);
  server.get("/", getAllWaContactsByOrgHandler);
  server.get(
    "/:id",
    { schema: { params: $waContact("byId") } },
    getWaContactByWaContactIdHandler,
  );
}
