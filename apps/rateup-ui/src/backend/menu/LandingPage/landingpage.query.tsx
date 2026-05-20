import { useQuery } from "@tanstack/react-query";

import { getMenuLandingPageById } from "./landingpage.api";

export const useMenuLandingById = (menuId: string) => {
  const getData = useQuery({
    enabled: !!menuId,
    queryKey: ["menuLanding", menuId],
    queryFn: () => getMenuLandingPageById(menuId),
  });
  return getData;
};
