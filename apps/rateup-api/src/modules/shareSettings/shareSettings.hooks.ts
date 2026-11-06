import type { FastifyReply, FastifyRequest } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { verifySurveyAccess } from "../survey/survey.auth.js";

const preHandlerHook = async (
  req: FastifyRequest<{ Params: { resourceName?: string; id: string } }>,
  rep: FastifyReply,
) => {
  const { resourceName } = req.params;
  await checkSession(req, rep);
  if (rep.sent) return;
  if (resourceName === "survey") {
    await verifySurveyAccess(req, rep);
  }
};

export { preHandlerHook };
