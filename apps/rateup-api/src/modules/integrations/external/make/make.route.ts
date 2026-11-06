import { IntegratedApps } from "../../../../types/enums.js";
import { automationApiRoutes } from "../../automation/api/automationApi.route.js";

/** The API Make scenarios call, at `/api/integration/external/make`. */
export const makeRoutes = automationApiRoutes(IntegratedApps.make);
