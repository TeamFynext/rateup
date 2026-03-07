import { useQuery } from "@tanstack/react-query";

import { orgWsAuthCheck } from "./org.ws.api";

export const useOrgWsAuthCheck = () => {
  return useQuery({
    queryKey: ["org_auth_check_for_ws"],
    queryFn: orgWsAuthCheck,
  });
};
