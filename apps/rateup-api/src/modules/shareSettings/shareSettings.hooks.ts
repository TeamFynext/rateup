import { checkSession } from "../../utils/checkSession.js";
import { verifyMenuAccess } from "../menu/menu.auth.js";
import { verifySurveyAccess } from "../survey/survey.auth.js";
import {
  getSettingsSchema,
  saveAndUpdateSettingsSchema,
} from "./shareSettings.schema.js";

const onRouteHookHandler = (routeOptions) => {
  switch (routeOptions.method) {
    case "GET": {
      routeOptions.schema = getSettingsSchema;
      break;
    }
    case "PUT": {
      routeOptions.schema = saveAndUpdateSettingsSchema;
    }
  }
};

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

export { onRouteHookHandler, preHandlerHook };
