import "dotenv/config";

import cors from "@fastify/cors";
import Fastify from "fastify";
import supertokens from "supertokens-node";
import { plugin } from "supertokens-node/framework/fastify";
import { errorHandler } from "supertokens-node/framework/fastify";
import { SuperTokensConfig, swaggerConfig } from "./config";
import { registerRoutes } from "./registerRoutes";
import formDataPlugin from "@fastify/formbody";
import { parseArrayString } from "./utils/array";
import { log, logOptions } from "./utils/logger";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyCron from "fastify-cron";
import {
  resetAnnualCounts,
  resetMonthlyCounts,
} from "./modules/stats/stats.service";
import {
  endSurveyCronAction,
  publishSurveyCronAction,
} from "./modules/survey/survey.service";
import { sendCampaignCronAction } from "./modules/campaign/campaign.service";
import {
  sendShopifySurveyCronAction,
  sendTemplateForShopifyAbandonedCheckouts,
} from "./modules/integrations/shopify/shopify.service";
import { subscriptionExpiryAlert } from "./utils/email/payments/subscriptionExpiryAlert";
import { sendPetpoojaWaTemplateCronAction } from "./modules/integrations/integrations.service";
import {
  processDripCampaigns,
  sendSchedulesWaMessages,
} from "./modules/whatsapp/wa_message_scheduler";
import { deactivateExpiredActions } from "./modules/loyalty/actions/actions.service";

const server = Fastify({
  loggerInstance: log,
  disableRequestLogging: true,
  //TODO this is a temporary fix for the large payload error issue
  bodyLimit: 30971520,
});

// req.body is not serialized at the time of logging. So adding a hook to log the body
// just before the request is processed
server.addHook("preHandler", async (req, _rep) => {
  // log body
  if (req.body) {
    //log.trace("Request body for id %s: %o", req.id, req.body);
  }
});

server.register(require("@fastify/websocket"));

supertokens.init(SuperTokensConfig);

server.register(cors, {
  origin: [
    process.env.ELECTION_APP_URL,
    process.env.FRONTEND_URL,
    ...parseArrayString(process.env.CORS_WHITELIST).map(
      (url) => new RegExp(url),
    ),
  ],
  allowedHeaders: ["Content-Type", ...supertokens.getAllCORSHeaders()],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
});

server.get("/api/ping", async (req, reply) => {
  try {
    throw new Error("This is a test error");
    reply.send({ message: "pong" });
  } catch (e) {
    log.error(e);
    reply.status(500).send({ message: "error" });
  }
});

server.register(fastifyCron, {
  jobs: [
    {
      name: "publishSurveys",
      cronTime: "0/15 * * * *", // Every 15 min
      onTick: async () => {
        const currentTime = new Date();
        console.log(
          ".......Running every 15min JOB --> Survey Publish Updations........",
          currentTime,
        );
        await Promise.all([
          publishSurveyCronAction(),
          endSurveyCronAction(),
          sendCampaignCronAction(),
          sendShopifySurveyCronAction(),
          // sendPetpoojaWaTemplateCronAction(),
          sendSchedulesWaMessages(),
        ]);
      },
      start: true,
      // Set to UTC+0
    },
    {
      name: "test",
      cronTime: "*/4 * * * *", // Every 4 minutes
      onTick: async () => {
        const currentTime = new Date();
        console.log(
          ".......Running every 4min JOB --> Drip Campaign Processing........",
          currentTime,
        );
        await processDripCampaigns();
      },
      start: true,
      timeZone: "Etc/UTC", // Set to UTC+0
    },
    {
      cronTime: "0 9 * * *", // This cron expression means "at 09:00 AM on every day"
      onTick: async () => {
        const currentTime = new Date();
        log.info(`......Running Daily Jobs --> .....${currentTime}`);
        await subscriptionExpiryAlert();
        await deactivateExpiredActions();
      },
      start: true,
    },
    // {
    //   cronTime: "0 0 1 * *", // This cron expression means "at 00:00 on day-of-month 1"
    //   onTick: async () => {
    //     const currentTime = new Date();
    // console.log("......Monthly Stats Reset JOB --> .....", currentTime);
    // try {
    // await resetMonthlyCounts();
    // } catch (error) {
    //   console.error("Failed to reset monthly counts:", error);
    // }
    //   },
    //   start: true, // Start the job immediately
    //   timeZone: "Etc/UTC", // Set to UTC+0
    //   //timeZone: "Asia/Kolkata", // UTC India

    //   // timeZone: 'UTC', // Specify the timezone if necessary
    //   //  cronTime: '* * * * *', // Every minute - for testing purpose
    // },
    {
      cronTime: "0 * * * *", // Every one hour
      onTick: async () => {
        const currentTime = new Date();
        log.info(`......Running hourly Jobs --> .....${currentTime}`);
        await sendTemplateForShopifyAbandonedCheckouts();
      },
      start: true,
    },
    {
      cronTime: "30 0 * * *",
      onTick: async () => {
        const currentTime = new Date();
        log.info(`......Running Every Day 12.30 AM --> .....${currentTime}`);
        await resetMonthlyCounts();
        await resetAnnualCounts();
      },
    },
  ],
});

server.register(formDataPlugin);
server.register(plugin);
server.setErrorHandler(errorHandler() as any);
async function main() {
  const port: number = parseInt(process.env.PORT || "3001");
  const host: string = process.env.HOST || "::";
  server
    .listen({
      port: port,
      host: host,
    })
    .then(() => {
      console.log(`Server ready at ${port}`);
      server.cron.startAllJobs();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });

  if (process.env.SWAGGER == "1") {
    server.after(() => {
      server.register(swagger, swaggerConfig);
      server.register(swaggerUi, {
        routePrefix: "/docs",
        uiConfig: {
          defaultModelsExpandDepth: -1,
          persistAuthorization: true,
        },
      });
      log.trace("Swagger registered. Exposing docs at /docs");
    });
  }

  server.after(() => {
    registerRoutes(server);
  });

  if (process.env.SWAGGER == "1") {
    await server.ready();
    server.swagger();
  }
}

if (require.main === module) {
  main();
}

export default server;
