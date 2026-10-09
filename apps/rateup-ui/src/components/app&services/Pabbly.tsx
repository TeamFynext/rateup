import { AutomationPlatformPage } from "@/components/app&services/AutomationPlatform.tsx";
import { IntegratedApps } from "@/types/enums.ts";

/** Pabbly Connect: the shared automation-platform page (`AutomationPlatform.tsx`). */
export function Pabbly() {
  return <AutomationPlatformPage platform={IntegratedApps.pabbly} />;
}
