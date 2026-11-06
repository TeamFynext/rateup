import { IntegratedApps } from "../../../../types/enums.js";
import { createAutomationProvider } from "../../automation/automation.provider.js";

/**
 * Pabbly Connect: the shared automation-platform provider (`automation.provider.ts`).
 * Its workflows get the same triggers and payloads as Zaps and Make scenarios.
 */
export const pabblyProvider = createAutomationProvider(IntegratedApps.pabbly, "Pabbly Connect");
