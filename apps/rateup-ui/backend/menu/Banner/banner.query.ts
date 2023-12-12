import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  createMenuBanner,
  deleteMenuBanner,
  getMenuBannerByMenuId,
  updateMenuBanner,
} from "./banner.api";

export const useCreateMenuBannerMutation = (
  menuId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createMenuBanner,
    onSuccess: () => {
      showSuccessToast("Menu banner created successfully");
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "category"] });
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "banner"] });
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error creating menu banner");
      onError();
    },
  });
  return createMutation;
};

export const useUpdateMenuBannerMutation = (
  menuId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: updateMenuBanner,
    onSuccess: () => {
      showSuccessToast("Menu banner updated");
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "category"] });
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "banner"] });
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error creating menu banner");
      onError();
    },
  });
  return createMutation;
};

export const useMenuBannerQuery = (menuId: string) => {
  const data = useQuery({
    queryKey: ["menu", menuId, "banner"],
    queryFn: () => getMenuBannerByMenuId(menuId),
  });
  return data;
};

export const useDeleteMenuBannerMutation = (
  menuId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: deleteMenuBanner,
    onSuccess: () => {
      showSuccessToast(
        "Menu banner deleted successfully",
        "menu-banner-delete",
        "",
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "category"] });
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "banner"] });
      onSuccess();
    },
    onError: () => {
      showErrorToast(
        "Error creating menu banner",
        "menu-banner-delete",
        "",
        true,
      );
      onError();
    },
  });
  return createMutation;
};
