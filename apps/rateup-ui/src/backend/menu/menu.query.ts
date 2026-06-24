import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createMenu,
  deleteMenu,
  getAllMenus,
  getFullMenuById,
  getMenuById,
  getMenuPublicById,
  getMenusByTeamId,
  updateMenu,
  updateMenuVisitedMutation,
} from "./menu.api";

// TODO: update tanstack querykeys. (use teamId & create a proper hierarchy)

export const useMenu = (menuId: string) =>
  useQuery({
    enabled: !!menuId,
    queryKey: ["menu", menuId],
    queryFn: () => getMenuById(menuId),
  });

export const useFullMenu = (menuId: string) =>
  useQuery({
    enabled: !!menuId,
    queryKey: ["menu", "full", menuId],
    queryFn: () => getFullMenuById(menuId),
  });

export const usePublicMenuById = (menuid: string) => {
  return useQuery({
    enabled: !!menuid,
    queryKey: ["menu", "public", menuid],
    queryFn: () => getMenuPublicById(menuid),
  });
};

export const useMenusByTeamId = (teamId: string) =>
  useQuery({
    enabled: !!teamId,
    queryKey: ["menus", teamId],
    queryFn: () => getMenusByTeamId(teamId),
  });

export const useAllMenus = () =>
  useQuery({
    queryKey: ["allMenus"],
    queryFn: () => getAllMenus(),
  });
export const useCreateMenuMutation = (_teamId: string, close, setIsCreating) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createMenu,
    onSuccess: () => {
      toast.success("Menu created successfully");
      queryClient.invalidateQueries({ queryKey: ["allMenus"] });
      close();
      setIsCreating(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating menu");
      setIsCreating(false);
    },
  });

  return createMutation;
};

export const useUpdateMenuMutation = (teamId, onSuccess, onError) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: updateMenu,
    onSuccess: () => {
      toast.success("Menu updated successfully");
      queryClient.invalidateQueries({ queryKey: ["allMenus"] });
      queryClient.invalidateQueries({ queryKey: ["menu", teamId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "full", teamId] });
      queryClient.invalidateQueries({ queryKey: ["menuLanding", teamId] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating menu");
      onError();
    },
  });

  return updateMutation;
};

export const useDeleteMenuMutation = (_teamId, onSuccess, onError) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteMenu,
    onSuccess: () => {
      toast.success("Menu deleted successfully", {
        id: "delete-data-menu",
      });
      queryClient.invalidateQueries({ queryKey: ["allMenus"] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting menu", {
        id: "delete-data-menu",
      });
      onError();
    },
  });

  return deleteMutation;
};

export function useUpdateMenuVisitedMutation() {
  return useMutation({
    mutationFn: (id: string) => updateMenuVisitedMutation(id),
  });
}
