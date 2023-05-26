import { createContext } from "react";

interface SelectedQContextType {
  selectedQ: Question;
}
export const SelectedQContext = createContext<SelectedQContextType>({selectedQ: null});