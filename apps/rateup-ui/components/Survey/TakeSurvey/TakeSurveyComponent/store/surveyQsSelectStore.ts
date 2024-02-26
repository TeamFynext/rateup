import { create } from "zustand";

export type Store = {
  answerSelected: {};
};

type Actions = {
  updateAnswerSelected: (props: {}) => void;
  reset: () => void;
};
const initialState = {
  answerSelected: {},
};

export const useAnswerSelectedStore = create<Store & Actions>((set) => ({
  ...initialState,
  updateAnswerSelected: (props) => set({ answerSelected: props }),
  reset: () => {
    set(initialState);
  },
}));
