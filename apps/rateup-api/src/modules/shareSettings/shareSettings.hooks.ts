import { checkSession } from "../../utils/checkSession.js";
import { verifyMenuAccess } from "../menu/menu.auth.js";
import { verifySurveyAccess } from "../survey/survey.auth.js";

const preHandlerHook = async (req, rep) => {
  const { resourceName } = req.params;
  await checkSession(req, rep);
  switch (resourceName) {
    case "survey": {
      await verifySurveyAccess(req, rep);
      break;
    }
    case "menu": {
      req.params.menuId = req.params.id;
      await verifyMenuAccess(req, rep);
      break;
    }
  }
};

export { preHandlerHook };
