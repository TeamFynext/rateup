import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
      toast.success("Menu banner created successfully");
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "category"] });
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "banner"] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating menu banner");
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
      toast.success("Menu banner updated");
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "category"] });
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "banner"] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating menu banner");
      onError();
    },
  });
  return createMutation;
};

export const useMenuBannerQuery = (menuId: string) => {
  const data = useQuery({
    enabled: !!menuId,
    queryKey: ["menu", menuId, "banner"],
    queryFn: () => getMenuBannerByMenuId(menuId),
    staleTime: Infinity,
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
      toast.success("Menu banner deleted successfully", {
        id: "menu-banner-delete",
      });
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "category"] });
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "banner"] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating menu banner", {
        id: "menu-banner-delete",
      });
      onError();
    },
  });
  return createMutation;
};
