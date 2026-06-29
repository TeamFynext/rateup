import { checkSession } from "../../utils/checkSession.js";
import { verifySurveyAccess } from "../survey/survey.auth.js";

const preHandlerHook = async (req, rep) => {
  const { resourceName } = req.params;
  await checkSession(req, rep);
  if (resourceName === "survey") {
    await verifySurveyAccess(req, rep);
  }
};

export { preHandlerHook };
