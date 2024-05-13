import { FastifyInstance } from "fastify";
import {
  createCheckoutSessionHandler,
  getSessionStatusHandler,
  webHookHandler,
} from "./stripe.controller";

export async function paymentStripeRoutes(server: FastifyInstance) {
  //server.addHook("preHandler", checkSession);

  // server.addContentTypeParser('application/json', { parseAs: 'string' }, function (request, body, done) {
  //   done(null, body);
  // });

  server.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    function (request, body, done) {
      if (request.url === "/api/payment/webhook") {
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

  server.post(
    "/create-checkout-session",
    {
      //   schema: {
      //     params: $Uref(""),
      //   },
    },
    createCheckoutSessionHandler,
  );

  server.get(
    "/session-status",
    {
      //   schema: {
      //     params: $Uref(""),
      //   },
    },
    getSessionStatusHandler,
  );

  server.post(
    "/webhook",
    {
      //   schema: {
      //     params: $Uref(""),
      //   },
    },
    webHookHandler,
  );
}
