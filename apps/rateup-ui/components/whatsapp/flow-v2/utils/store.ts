import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { QuestionType2 } from "@/types/enums";

interface Screen {
  id: string;
  title: string;
  terminal: boolean;
  layout: Layout;
}

interface Layout {
  type: string;
  children: FormElement[];
}

interface FormElement {
  id: string;
  type: QuestionType2;
  required?: boolean;
  label: string;
  name?: string;
  "input-type"?: string;
  "left-caption"?: string;
  "right-caption"?: string;
  "on-click-action"?: {
    name: string;
    next?: {
      type: string;
      name: string;
    };
    payload: Record<string, unknown>;
  };
}

interface StoreState {
  screens: Screen[];
  currentScreenId: string | null;
  getScreens: () => Screen[];
  addScreens: (screens: Screen[]) => void;
  addScreenWithTitle: (title: string) => void;
  deleteScreen: () => void;
  updateComponentInScreen: (
    id: string,
    updatedComponent: Partial<FormElement>,
  ) => void;
  getScreen: (screenId: string) => Screen | undefined;
  getComponent: (componentName: string) => FormElement | undefined;
  setCurrentScreenId: (screenId: string) => void;
  getCurrentScreen: () => Screen | undefined;
  updateScreen: (updatedScreen: Partial<Screen>) => void;
  updateComponentsInScreen: (updatedComponents: FormElement[]) => void;
  addComponentToScreen: (omponent: FormElement) => void;
  deleteComponentFromScreen: (index: number) => void;
}

const useFlowStore = create<StoreState>()(
  immer((set, get) => ({
    screens: [],
    currentScreenId: null,
    getScreens: () => {
      return get().screens;
    },
    addScreens: (screens) =>
      set((state) => {
        state.screens = screens;
      }),
    addScreenWithTitle: (title) =>
      set((state) => {
        const newScreenId = `screen_${uuidv4().replace(/[^a-zA-Z_]/g, "")}`;
        const newScreen: Screen = {
          id: newScreenId,
          title,
          terminal: false,
          layout: {
            type: "SingleColumnLayout",
            children: [
              {
                id: "slfkdj",
                type: QuestionType2.Footer,
                label: "Continue",
                "on-click-action": {
                  name: "complete",
                  payload: {},
                },
              },
            ],
          },
        };
        state.screens.push(newScreen);
        state.currentScreenId = newScreenId;
      }),
    setCurrentScreenId: (screenId) =>
      set((state) => {
        state.currentScreenId = screenId;
      }),
    getCurrentScreen: () => {
      const state = get();
      return state.screens.find(
        (screen) => screen.id === state.currentScreenId,
      );
    },
    deleteScreen: () =>
      set((state) => {
        const screenId = state.currentScreenId;
        const screenIndex = state.screens.findIndex(
          (screen) => screen.id === screenId,
        );
        state.screens = state.screens.filter(
          (screen) => screen.id !== screenId,
        );

        if (screenIndex > 0 && screenIndex < state.screens.length) {
          const previousScreen = state.screens[screenIndex - 1];
          const nextScreen = state.screens[screenIndex];
          const footer = previousScreen.layout.children.find(
            (child) => child.type === "Footer",
          );
          if (footer) {
            footer["on-click-action"] = {
              name: "navigate",
              next: {
                type: "screen",
                name: nextScreen.id,
              },
              payload: {},
            };
          }
        } else if (screenIndex > 0 && screenIndex === state.screens.length) {
          const previousScreen = state.screens[screenIndex - 1];
          const footer = previousScreen.layout.children.find(
            (child) => child.type === "Footer",
          );
          if (footer) {
            footer["on-click-action"] = {
              name: "complete",
              payload: {},
            };
          }
        }

        state.screens.forEach((s, index) => {
          s.terminal = index === state.screens.length - 1;
        });
      }),
    updateScreen: (updatedScreen) =>
      set((state) => {
        const screen = state.getCurrentScreen();
        if (screen) {
          Object.assign(screen, updatedScreen);
        }
        state.screens.forEach((s, index) => {
          s.terminal = index === state.screens.length - 1;
        });
      }),
    updateComponentsInScreen: (updatedComponents) =>
      set((state) => {
        let { currentScreenId } = state;
        const screen = state.screens.find(
          (screen) => screen.id === currentScreenId,
        );
        if (screen) {
          screen.layout.children = updatedComponents;
        }
        state.screens.forEach((s, index) => {
          s.terminal = index === state.screens.length - 1;
        });
      }),

    addComponentToScreen: (component) =>
      set((state) => {
        let { currentScreenId } = state;
        const screen = state.screens.find(
          (screen) => screen.id === currentScreenId,
        );
        if (screen) {
          screen.layout.children.push(component);
        }
      }),

    deleteComponentFromScreen: (index) =>
      set((state) => {
        let { currentScreenId } = state;
        const screen = state.screens.find(
          (screen) => screen.id === currentScreenId,
        );
        if (screen) {
          screen.layout.children = screen.layout.children.filter(
            (_, i) => i !== index,
          );
        }
      }),
    updateComponentInScreen: (id, updatedComponent) =>
      set((state) => {
        let { currentScreenId } = state;
        const screen = state.screens.find(
          (screen) => screen.id === currentScreenId,
        );
        if (screen) {
          const component = screen.layout.children?.find((el) => el.id === id);
          if (component) {
            Object.assign(component, updatedComponent);
          }
        }
      }),
    getScreen: (screenId) => {
      const state = get();
      return state.screens.find((screen) => screen.id === screenId);
    },
    getComponent: (componentName) => {
      const screen = get().getCurrentScreen();
      if (screen) {
        return screen.layout.children.find(
          (component) => component.id === componentName,
        );
      }
      return undefined;
    },
  })),
);

export default useFlowStore;
