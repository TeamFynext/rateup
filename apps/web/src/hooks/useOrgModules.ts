import { useMemo } from "react";

import { useUserInfo } from "@/backend/user/user.query";
import { ORG_MODULE_INFO, type OrgModule } from "@/utils/modules.ts";

export interface OrgModulesState {
  isOn: (module: OrgModule) => boolean;
  hiddenModules: ReadonlySet<OrgModule>;
  /** `PERMISSION_GROUPS` keys whose module is off. */
  hiddenPermissionGroups: ReadonlySet<string>;
  isPending: boolean;
}

/** Which product areas the org shows, from `/user/info`. An older API answers with none hidden. */
export function useOrgModules(): OrgModulesState {
  const { data, isPending } = useUserInfo();
  const hidden = data && "data" in data ? data.data.hiddenModules : undefined;

  return useMemo(() => {
    const hiddenModules = new Set(
      ORG_MODULE_INFO.map((info) => info.key).filter((key) => hidden?.includes(key)),
    );
    return {
      isOn: (module) => !hiddenModules.has(module),
      hiddenModules,
      hiddenPermissionGroups: new Set(
        ORG_MODULE_INFO.filter((info) => hiddenModules.has(info.key)).flatMap(
          (info) => info.permissionGroups,
        ),
      ),
      isPending,
    };
  }, [hidden, isPending]);
}
