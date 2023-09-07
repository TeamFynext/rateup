import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMenuItem, deleteMenuItem, getItemsByCategoryId, updateMenuItem } from "./mItem.api";
import { showSuccessToast, showErrorToast } from "../../../utils/notifications";

export const useItemsByCategoryId = (categoryId: string, menuId: string) =>
  useQuery({
    enabled: !!categoryId,
    queryKey: ["menu", menuId, "category", categoryId, "item"],
    queryFn: () => getItemsByCategoryId(categoryId),
  });

export const useCreateMenuItemMutation = (categoryId: string, menuId: string, onSuccess = () => { }, onError = () => { }) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      showSuccessToast("Menu item created successfully");
      queryClient.invalidateQueries(["menu", menuId, "category", categoryId, "item"]);
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error creating menu item");
      onError();
    }
  })
  return createMutation;
}

export const useDeleteMenuItemMutation = (categoryId: string, menuId: string, onSuccess = () => { }, onError = () => { }) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      showSuccessToast("Menu item deleted successfully");
      queryClient.invalidateQueries(["menu", menuId, "category", categoryId, "item"]);
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error deleting menu item");
      onError();
    }
  })
  return deleteMutation;
}

export const useUpdateMenuItemMutation = (categoryId: string, menuId: string, onSuccess = () => { }, onError = () => { }) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ menuItemId, menuItem }: { menuItemId: string, menuItem: string }) => updateMenuItem(menuItemId, menuItem),
    onSuccess: () => {
      showSuccessToast("Menu item updated successfully");
      queryClient.invalidateQueries(["menu", menuId, "category", categoryId, "item"]);
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error updating menu item");
      onError();
    }
  })
  return updateMutation;
}