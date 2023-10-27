import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMenu,
  deleteMenu,
  getAllMenus,
  getFullMenuById,
  getMenuById,
  getMenuPublicById,
  getMenusByTeamId,
  updateMenu,
} from "./menu.api";
import { showSuccessToast, showErrorToast } from "../../utils/notifications";

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
export const useCreateMenuMutation = (teamId: string, close, setIsCreating) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createMenu,
    onSuccess: () => {
      showSuccessToast("Menu created successfully");
      queryClient.invalidateQueries(["allMenus"]);
      close();
      setIsCreating(false);
    },
    onError: () => {
      showErrorToast("Error creating menu");
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
      showSuccessToast("Menu updated successfully");
      queryClient.invalidateQueries(["allMenus"]);
      queryClient.invalidateQueries(["menu", teamId]);
      queryClient.invalidateQueries(["menu", "full", teamId]);
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error updating menu");
      onError();
    },
  });

  return updateMutation;
};

export const useDeleteMenuMutation = (teamId, onSuccess, onError) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteMenu,
    onSuccess: () => {
      showSuccessToast("Menu deleted successfully", "menu-delete");
      queryClient.invalidateQueries(["allMenus"]);
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error deleting menu");
      onError();
    },
  });

  return deleteMutation;
};
