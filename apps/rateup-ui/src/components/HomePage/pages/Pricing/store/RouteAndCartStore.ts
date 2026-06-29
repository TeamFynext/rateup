import { create } from "zustand";

interface Cart {
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
}
export interface Store {
  route: string;
  cart: Cart;
}

interface Actions {
  updateRouteAndCart: (newRoute: string, cart: Cart) => void;
  reset: () => void;
}
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

interface ImageStore {
  imageToDelete: object[];
}

interface ImageActions {
  updateImageArray: (image: object) => void;
  resetImage: () => void;
}
const initalImageData = {
  imageToDelete: [],
};
export const useImageStore = create<ImageStore & ImageActions>((set) => ({
  ...initalImageData,
  updateImageArray: (image) => set((state) => ({ imageToDelete: [...state.imageToDelete, image] })),
  resetImage: () => set(initalImageData),
}));
