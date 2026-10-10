import { AutomationPlatformPage } from "@/components/app&services/AutomationPlatform.tsx";
import { IntegratedApps } from "@/types/enums.ts";

/** Make: the shared automation-platform page (`AutomationPlatform.tsx`). */
export function Make() {
  return <AutomationPlatformPage platform={IntegratedApps.make} />;
}
