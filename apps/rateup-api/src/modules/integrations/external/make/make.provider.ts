import { IntegratedApps } from "../../../../types/enums.js";
import { createAutomationProvider } from "../../automation/automation.provider.js";

/**
 * Make: the shared automation-platform provider (`automation.provider.ts`). Its
 * scenarios get the same triggers and payloads as Zaps.
 */
export const makeProvider = createAutomationProvider(IntegratedApps.make, "Make");
