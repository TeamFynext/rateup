import { IntegratedApps } from "../../../../types/enums.js";
import { automationApiRoutes } from "../../automation/api/automationApi.route.js";

/**
 * The API the RateUp app on Pabbly Connect calls (`pabbly-app/`), at
 * `/api/integration/external/pabbly`. The same routes as Make's, on Pabbly's own key.
 */
export const pabblyRoutes = automationApiRoutes(IntegratedApps.pabbly);
