import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMenuCategory,
  deleteMenuCategory,
  getMenuCategoriesByMenuId,
  updateMenuCategory,
  updateSortOrderMenuCategory,
} from "./mCategory.api";
import { showSuccessToast, showErrorToast } from "../../../utils/notifications";

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
      showSuccessToast("Menu category created successfully");
      queryClient.invalidateQueries({ queryKey: ["menu-category", menuId] });

      onSuccess();
    },
    onError: () => {
      showErrorToast("Error creating menu category");
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
      showSuccessToast("Menu category updated successfully");
      queryClient.invalidateQueries({ queryKey: ["menu-category", menuId] });

      onSuccess();
    },
    onError: () => {
      showErrorToast("Error updating menu category");
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
      showSuccessToast(
        "Menu category deleted successfully",
        "delete-data-menu-category",
        "",
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["menu-category", menuId] });

      onSuccess();
    },
    onError: () => {
      showErrorToast(
        "Error deleting menu category",
        "delete-data-menu-category",
        "",
        true,
      );
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
      showSuccessToast("Menu category updated successfully");
      queryClient.invalidateQueries({ queryKey: ["menu", menuId, "category"] });
      onSuccess();
    },
  });
  return updateMutation;
};
