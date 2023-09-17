import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMenuCategory, deleteMenuCategory, getMenuCategoriesByMenuId, updateMenuCategory } from "./mCategory.api";
import { showSuccessToast, showErrorToast } from "../../../utils/notifications";

export const useCategories = (menuId: string, initialData) =>
  useQuery({
    enabled: !!menuId,
    queryKey: ["menu", menuId, "category"],
    queryFn: () => getMenuCategoriesByMenuId(menuId),
    initialData: initialData,
  });

export const useCreateMenuCategoryMutation = (menuId: string, onSuccess = () => { }, onError = () => { }) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createMenuCategory,
    onSuccess: () => {
      showSuccessToast("Menu category created successfully");
      queryClient.invalidateQueries(["menu", menuId, "category"]);
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error creating menu category");
      onError();
    }
  })

  return createMutation;
}

export const useUpdateMenuCategoryMutation = (menuId: string, onSuccess = () => { }, onError = () => { }) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: updateMenuCategory,
    onSuccess: () => {
      showSuccessToast("Menu category updated successfully");
      queryClient.invalidateQueries(["menu", menuId, "category"]);
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error updating menu category");
      onError();
    }
  })

  return updateMutation;
}

export const useDeleteMenuCategoryMutation = (menuId: string, onSuccess = () => { }, onError = () => { }) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteMenuCategory,
    onSuccess: () => {
      showSuccessToast("Menu category deleted successfully");
      queryClient.invalidateQueries(["menu", menuId, "category"]);
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error deleting menu category");
      onError();
    }
  })

  return deleteMutation;
}

