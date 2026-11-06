import { IntegratedApps } from "../../../../types/enums.js";
import { automationApiRoutes } from "../../automation/api/automationApi.route.js";

/**
 * The API Pabbly Connect workflows call, at
 * `/api/integration/external/pabbly`. The same routes as Make's, on Pabbly's own key.
 */
export const pabblyRoutes = automationApiRoutes(IntegratedApps.pabbly);
