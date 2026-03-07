import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createMenuCategory,
  deleteMenuCategory,
  getMenuCategoriesByMenuId,
  updateMenuCategory,
  updateSortOrderMenuCategory,
} from "./mCategory.api";

export const useCategories = (menuId: string, initialData) =>
  useQuery({
    enabled: !!menuId,
    queryKey: ["menu-category", menuId],
    queryFn: () => getMenuCategoriesByMenuId(menuId),
    initialData: initialData,
  });

export const useCreateMenuCategoryMutation = (
  menuId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createMenuCategory,
    onSuccess: () => {
      toast.success("Menu category created successfully");
      queryClient.invalidateQueries({ queryKey: ["menu-category", menuId] });

      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating menu category");
      onError();
    },
  });

  return createMutation;
};

export const useUpdateMenuCategoryMutation = (
  menuId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: updateMenuCategory,
    onSuccess: () => {
      toast.success("Menu category updated successfully");
      queryClient.invalidateQueries({ queryKey: ["menu-category", menuId] });

      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating menu category");
      onError();
    },
  });

  return updateMutation;
};

export const useDeleteMenuCategoryMutation = (
  menuId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteMenuCategory,
    onSuccess: () => {
      toast.success("Menu category deleted successfully", {
        id: "delete-data-menu-category",
      });
      queryClient.invalidateQueries({ queryKey: ["menu-category", menuId] });

      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting menu category", {
        id: "delete-data-menu-category",
      });
      onError();
    },
  });

  return deleteMutation;
};

export const useUpdateSortOrderMenuCategoryMutation = (
  menuId: string,
  onSuccess = () => {},
) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ menuCategory }: { menuCategory: any }) =>
      updateSortOrderMenuCategory(menuId, menuCategory),
    onSuccess: () => {
      toast.success("Menu category updated successfully");
      queryClient.invalidateQueries({ queryKey: ["menu-category", menuId] });
      onSuccess();
    },
  });
  return updateMutation;
};
