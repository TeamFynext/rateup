import { webHookHandler } from "./stripe.controller.js";
import { FastifyInstance } from "fastify";

export async function stripePublicRoutes(server: FastifyInstance) {
  server.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    function (request, body, done) {
      if (request.url === "/api/public/payment/stripe/webhook") {
        done(null, body);
      } else {
        // For other routes, parse the body as JSON
        try {
          done(null, JSON.parse(body.toString()));
        } catch (err) {
          done(err, null);
        }
      }
    },
  );

  server.post("/webhook", webHookHandler);
}
