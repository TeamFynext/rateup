import { IntegratedApps } from "../../../../types/enums.js";
import { automationApiRoutes } from "../../automation/api/automationApi.route.js";

/** The API the RateUp app on Make calls (`make-app/`), at `/api/integration/external/make`. */
export const makeRoutes = automationApiRoutes(IntegratedApps.make);
