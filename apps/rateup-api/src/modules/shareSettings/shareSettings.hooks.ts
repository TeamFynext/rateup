import type { FastifyReply, FastifyRequest } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { verifySurveyAccess } from "../survey/survey.auth.js";

const preHandlerHook = async (
  req: FastifyRequest<{ Params: { resourceName?: string; id: string } }>,
  rep: FastifyReply,
) => {
  const { resourceName } = req.params;
  await checkSession(req, rep);
  // checkSession signals failure by SENDING a 401 and returning, not by
  // throwing. The survey branch used to run unconditionally after it, so an
  // invalid session produced a verifySurveyAccess call with request.userId
  // undefined and a duplicate-send warning on every rejected request.
  // See issues.txt 35.5.
  if (rep.sent) return;
  if (resourceName === "survey") {
    await verifySurveyAccess(req, rep);
  }
};

export { preHandlerHook };
