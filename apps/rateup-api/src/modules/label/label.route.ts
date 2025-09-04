import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  createLabelHandler,
  deleteLabelByIdHandler,
  getLabelsHandler,
  updateLabelHandler,
} from "./label.controller";
import { $LabelRef } from "./label.schema";

export async function labelRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get("/", getLabelsHandler);
  server.post(
    "/",
    {
      schema: {
        body: $LabelRef("labelBodySchema"),
      },
    },
    createLabelHandler,
  );
  server.put(
    "/:labelId",
    {
      schema: {
        body: $LabelRef("labelBodySchema"),
        params: $LabelRef("labelIdParamSchema"),
      },
    },
    updateLabelHandler,
  );
  server.put(
    "/",
    {
      schema: {
        body: $LabelRef("labelBodySchema"),
      },
    },
    updateLabelHandler,
  );
  server.delete(
    "/:labelId",
    {
      schema: {
        params: $LabelRef("labelIdParamSchema"),
      },
    },
    deleteLabelByIdHandler,
  );
}
