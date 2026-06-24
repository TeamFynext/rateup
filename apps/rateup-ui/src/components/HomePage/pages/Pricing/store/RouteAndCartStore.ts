import { create } from "zustand";

type Cart = {
  id: string;
  name: string;
  currency: string;
  description: string[];
  amount: string;
  currencySymbol: string;
  period: string;
  gateway: string;
  planId: string;
  priceId: string;
  trialDays?: number;
};
export type Store = {
  route: string;
  cart: Cart;
};

type Actions = {
  updateRouteAndCart: (newRoute: string, cart: Cart) => void;
  reset: () => void;
};
const initialState = {
  route: "/dashboard",
  cart: {
    id: "",
    name: "",
    currency: "USD",
    description: [""],
    amount: "0",
    currencySymbol: "$",
    period: "",
    gateway: "",
    planId: "",
    priceId: "",
  },
};

export const useRouteAndCartStore = create<Store & Actions>((set) => ({
  ...initialState,
  updateRouteAndCart: (newRoute, cart) => set(() => ({ route: newRoute, cart: cart })),
  reset: () => {
    set(initialState);
  },
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
  updateImageArray: (image) => set((state) => ({ imageToDelete: [...state.imageToDelete, image] })),
  resetImage: () => set(initalImageData),
}));

type VisibleColumnStore = {
  visibleColumn: string[];
};

type VisibleColumnActions = {
  updateVisibleColumnArray: (VisibleColumn: string[]) => void;
  resetVisibleColumn: () => void;
};
