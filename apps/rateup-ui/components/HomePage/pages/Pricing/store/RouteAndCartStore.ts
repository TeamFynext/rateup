import { create } from "zustand";

type Store = {
  route: string;
  cart: { id: string; name: string };
};

type Actions = {
  updateRouteAndCart: (
    newRoute: string,
    cart: { id: string; name: string },
  ) => void;
};

export const useRouteAndCartStore = create<Store & Actions>((set) => ({
  route: "/dashboard",
  cart: { id: "", name: "" },
  updateRouteAndCart: (newRoute, cart) =>
    set(() => ({ route: newRoute, cart: cart })),
}));

type ImageStore = {
  imageToDelete: object[];
};

type ImageActions = {
  updateImageArray: (image: object) => void;
  resetImage: () => void;
};
const initalImageData = {
  imageToDelete: [],
};
export const useImageStore = create<ImageStore & ImageActions>((set) => ({
  ...initalImageData,
  updateImageArray: (image) =>
    set((state) => ({ imageToDelete: [...state.imageToDelete, image] })),
  resetImage: () => set(initalImageData),
}));
