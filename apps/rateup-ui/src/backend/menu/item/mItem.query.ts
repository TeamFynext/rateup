import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createMenuItem,
  createMenuItemUsingCsv,
  deleteMenuItem,
  getItemsByCategoryId,
  updateMenuItem,
  updateSortOrderMenuItem,
} from "./mItem.api";

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
      toast.success("Menu item created successfully");
      queryClient.invalidateQueries({
        queryKey: ["menu", menuId, "category", categoryId, "item"],
      });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating menu item");
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
      toast.success("Menu items created successfully");
      queryClient.invalidateQueries({ queryKey: ["menu-category", menuId] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating menu items");
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
      toast.success("Menu item deleted successfully", {
        id: "delete-data-menu-item",
      });
      queryClient.invalidateQueries({
        queryKey: ["menu", menuId, "category", categoryId, "item"],
      });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting menu item", {
        id: "delete-data-menu-item",
      });
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
    mutationFn: ({ menuItemId, menuItem }: { menuItemId: string; menuItem: any }) =>
      updateMenuItem(menuItemId, menuItem),
    onSuccess: () => {
      toast.success("Menu item updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["menu", menuId, "category", categoryId, "item"],
      });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating menu item");
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
    mutationFn: ({ menuItem }: { menuItem: any }) => updateSortOrderMenuItem(categoryId, menuItem),
    onSuccess: () => {
      toast.success("Menu item updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["menu", menuId, "category", categoryId, "item"],
      });
      onSuccess();
    },
  });
  return updateMutation;
};
