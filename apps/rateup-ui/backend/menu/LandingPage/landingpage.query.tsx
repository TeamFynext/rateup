import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMenuLandingPageById,
  updateMenuLandingPageById,
  updateMenuLandingPageOptionById,
} from "./landingpage.api";
import { showSuccessToast } from "../../../utils/notifications";

export const useMenuLandingById = (menuId: string) => {
  const getData = useQuery({
    enabled: !!menuId,
    queryKey: ["menuLanding", menuId],
    queryFn: () => getMenuLandingPageById(menuId),
  });
  return getData;
};

export const useMenuLandingMutationById = (menuId: string) => {
  const queryClient = useQueryClient();
  const menuLandingMutation = useMutation({
    mutationFn: (data) => updateMenuLandingPageById(menuId, data),
    onSuccess: () => {
      showSuccessToast("MenuLanding updated successfully");
      queryClient.invalidateQueries({ queryKey: ["menuLanding", menuId] });
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "category"] });
    },
  });
  return menuLandingMutation;
};

export const useUpdateMenuLandingPageOptionById = (menuId: string) => {
  const queryClient = useQueryClient();
  const menuLandingMutation = useMutation({
    mutationFn: (data: any) => updateMenuLandingPageOptionById(menuId, data),
    onSuccess: () => {
      showSuccessToast("MenuLanding options updated successfully");
      queryClient.invalidateQueries({ queryKey: ["menuLanding", menuId] });
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "category"] });
    },
  });
  return menuLandingMutation;
};
