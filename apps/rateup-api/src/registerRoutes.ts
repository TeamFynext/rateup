import { FastifyInstance } from "fastify";

import { orgRoutes } from "./modules/org/org.route";
import { orgSchemas } from "./modules/org/org.schema";
import { questionRoutes } from "./modules/question/question.route";
import { questionSchemas } from "./modules/question/question.schema";
import { responsePublicRoutes } from "./modules/response/response.public.route";
import { responseRoutes } from "./modules/response/response.route";
import { responseSchemas } from "./modules/response/response.schema";
import { surveyPublicRoutes } from "./modules/survey/survey.public.routes";
import { surveyRoutes } from "./modules/survey/survey.route";
import { surveySchemas } from "./modules/survey/survey.schema";
import { landingPageSchemas } from "./modules/landingPage/landingpage.schema";
import { teamRoutes } from "./modules/team/team.route";
import { teamSchemas } from "./modules/team/team.schema";
import { userRoutes } from "./modules/user/user.route";
import { waWebhookRoutes, whatsappRoutes } from "./modules/whatsappSurvey/wasurvey.route";
import { fileUploadPublicRoutes } from "./modules/fileUpload/fileUpload.public.route";
import { uploadSchemas } from "./modules/fileUpload/fileUpload.schema";
import { userSchemas } from "./modules/user/user.schema";
import { rGroupSchemas } from "./modules/respondent/rgroup/rgroup.schema";
import { rgroupRoutes } from "./modules/respondent/rgroup/rgroup.route";
import { wasurveySchemas } from "./modules/whatsappSurvey/wasurvey.schema";
import { respondentRoutes } from "./modules/respondent/respondent/respondent.route";
import { respondentSchemas } from "./modules/respondent/respondent/respondent.schema";
import { LandingPageRoutes } from "./modules/landingPage/landingpage.route";

export function registerRoutes(server: FastifyInstance): void {
    const modules = [
        surveySchemas,
        questionSchemas,
        orgSchemas,
        teamSchemas,
        responseSchemas,
        uploadSchemas,
        userSchemas,
        rGroupSchemas,
        respondentSchemas,
        wasurveySchemas,
        landingPageSchemas
    ];
    for (const module of modules) {
        for (const schema of module) {
            server.addSchema(schema);
        }
    }
    server.register(surveyRoutes, { prefix: "api/survey" });
    server.register(LandingPageRoutes, { prefix: "api/landingpage" });
    server.register(questionRoutes, { prefix: "api/question/:surveyId" });
    server.register(userRoutes, { prefix: "api/user" });
    server.register(orgRoutes, { prefix: "api/org" });
    server.register(teamRoutes, { prefix: "api/team" });
    server.register(responseRoutes, { prefix: "api/response" });
    server.register(surveyPublicRoutes, { prefix: "api/public/survey" })
    server.register(responsePublicRoutes, { prefix: "api/public/response" })
    server.register(fileUploadPublicRoutes, { prefix: "api/public/upload" })
    server.register(rgroupRoutes, { prefix: "api/rgroup" })
    server.register(whatsappRoutes, { prefix: "api/wa" })
    server.register(respondentRoutes, { prefix: "api/respondent" })
    server.register(waWebhookRoutes, { prefix: "webhook" })
}