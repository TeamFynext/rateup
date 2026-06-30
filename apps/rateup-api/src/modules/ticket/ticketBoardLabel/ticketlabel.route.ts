import { FastifyInstance } from "fastify";
import * as labelController from "./ticketlabel.controller.js";
import { createLabelSchema, updateLabelSchema, deleteLabelsSchema } from "./ticketlabel.schema.js";

const ticketLabelsRoutes = async (fastify: FastifyInstance) => {
  fastify.post("/boards/:ticketBoardId/labels", {
    schema: {
      tags: ["Ticket Board Labels"],
      body: createLabelSchema,
    },
    handler: labelController.createLabelHandler,
  });

  fastify.get("/boards/:ticketBoardId/labels", {
    schema: {
      tags: ["Ticket Board Labels"],
    },
    handler: labelController.getLabelsHandler,
  });

  fastify.put("/labels/:id", {
    schema: {
      tags: ["Ticket Board Labels"],
      body: updateLabelSchema,
    },
    handler: labelController.updateLabelHandler,
  });

  fastify.delete("/labels/:id", {
    schema: {
      tags: ["Ticket Board Labels"],
    },
    handler: labelController.deleteLabelHandler,
  });

  fastify.delete("/boards/:ticketBoardId/labels", {
    schema: {
      tags: ["Ticket Board Labels"],
      body: deleteLabelsSchema,
    },
    handler: labelController.deleteLabelsHandler,
  });
};

export default ticketLabelsRoutes;
