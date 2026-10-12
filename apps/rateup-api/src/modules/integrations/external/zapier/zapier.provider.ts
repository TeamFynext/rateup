import { IntegratedApps } from "../../../../types/enums.js";
import { createAutomationProvider } from "../../automation/automation.provider.js";
import { deliverZapierHook, queueZapierTrigger } from "./zapier.deliver.js";

/** Zapier: the shared automation-platform provider (`automation.provider.ts`). */
export const zapierProvider = createAutomationProvider(IntegratedApps.zapier, "Zapier", {
  queue: queueZapierTrigger,
  deliver: deliverZapierHook,
});
