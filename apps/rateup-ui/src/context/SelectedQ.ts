import { createContext } from "react";

interface SelectedQContextType {
  selectedQ: Question | null;
  alignment: string;
}
export const SelectedQContext = createContext<SelectedQContextType>({
  selectedQ: null,
  alignment: "left",
});
