import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMenuItem,
  createMenuItemUsingCsv,
  deleteMenuItem,
  getItemsByCategoryId,
  updateMenuItem,
  updateSortOrderMenuItem,
} from "./mItem.api";
import { showSuccessToast, showErrorToast } from "../../../utils/notifications";

export const useItemsByCategoryId = (categoryId: string, menuId: string) =>
  useQuery({
    enabled: !!categoryId,
    queryKey: ["menu", menuId, "category", categoryId, "item"],
    queryFn: () => getItemsByCategoryId(categoryId),
  });

export const useCreateMenuItemMutation = (
  categoryId: string,
  menuId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      showSuccessToast("Menu item created successfully");
      queryClient.invalidateQueries({
        queryKey: ["menu", menuId, "category", categoryId, "item"],
      });
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error creating menu item");
      onError();
    },
  });
  return createMutation;
};

export const useCreateMenuItemUsingCsvMutation = (
  menuId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createMenuItemUsingCsv,
    onSuccess: () => {
      showSuccessToast("Menu items created successfully");
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "category"] });
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error creating menu items");
      onError();
    },
  });
  return createMutation;
};

export const useDeleteMenuItemMutation = (
  categoryId: string,
  menuId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      showSuccessToast(
        "Menu item deleted successfully",
        "delete-data-menu-item",
        "",
        true,
      );
      queryClient.invalidateQueries({
        queryKey: ["menu", menuId, "category", categoryId, "item"],
      });
      onSuccess();
    },
    onError: () => {
      showErrorToast(
        "Error deleting menu item",
        "delete-data-menu-item",
        "",
        true,
      );
      onError();
    },
  });
  return deleteMutation;
};

export const useUpdateMenuItemMutation = (
  categoryId: string,
  menuId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({
      menuItemId,
      menuItem,
    }: {
      menuItemId: string;
      menuItem: any;
    }) => updateMenuItem(menuItemId, menuItem),
    onSuccess: () => {
      showSuccessToast("Menu item updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["menu", menuId, "category", categoryId, "item"],
      });
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error updating menu item");
      onError();
    },
  });
  return updateMutation;
};

export const useUpdateSortOrderMenuItemMutation = (
  categoryId: string,
  menuId: string,
  onSuccess = () => {},
) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ menuItem }: { menuItem: any }) =>
      updateSortOrderMenuItem(categoryId, menuItem),
    onSuccess: () => {
      showSuccessToast("Menu item updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["menu", menuId, "category", categoryId, "item"],
      });
      onSuccess();
    },
  });
  return updateMutation;
};
