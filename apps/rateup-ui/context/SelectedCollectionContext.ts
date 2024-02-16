import { createContext } from "react";

type ISelectedTestimonialCollectionCtx = {
  selectedCollectionId: string;
};
const SelectedTestimonialCollectionContext =
  createContext<ISelectedTestimonialCollectionCtx>({
    selectedCollectionId: "",
  });

export default SelectedTestimonialCollectionContext;
