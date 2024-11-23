import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { QuestionType2, WaQuestions } from "@/types/enums";

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

type GoogleReview = {
  minRating?: number;
  minOpinion?: number;
  reqOptions?: Array<string>;
} | null;

export interface FormElement {
  id: string;
  type: QuestionType2;
  required?: boolean;
  label: string;
  name?: string;
  text?: string;
  metaType?: WaQuestions;
  header?: string;
  googleReview?: GoogleReview;
  "input-type"?: string;
  "left-caption"?: string;
  "right-caption"?: string;
  "data-source"?: Array<{ title: string; id: string }>;
  "on-click-action"?: {
    name: string;
    next?: {
      type: string;
      name: string;
    };
    payload: Record<string, unknown>;
  };
}
export enum EditFlowRightPanel {
  ElementEditor = "element-editor",
  TypeSelection = "type-selection",
}
export enum EditorType {
  LogicEditor = "logic-editor",
  GoogleReviewEditor = "google-review-editor",
  ElementEditor = "element-editor",
}

interface StoreState {
  screens: Screen[];
  currentScreenId: string | null;
  currentElementId: string | null;
  currentElementType: QuestionType2 | null;
  activeEditor: EditFlowRightPanel | null;
  flowEditable: boolean;
  detailActiveEditor: EditorType;
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
  setCurrentElement: (elementId?: string, type?: QuestionType2) => void;
  setFlowEditable: (editable: boolean) => void;
  setActiveEditor: (editor: EditFlowRightPanel) => void;
  setDetailActiveEditor: (editor: EditorType) => void;
  getCurrentScreen: () => Screen | undefined;
  getCurrentElement: () => FormElement | undefined;
  updateScreen: (updatedScreen: Partial<Screen>) => void;
  updateComponentsInScreen: (updatedComponents: FormElement[]) => void;
  addComponentToScreen: (omponent: FormElement) => void;
  deleteComponentFromScreen: (feId: string) => void;
}

const useFlowStore = create<StoreState>()(
  immer((set, get) => ({
    screens: [],
    currentScreenId: null,
    currentElementId: null,
    currentElementType: null,
    activeEditor: null,
    flowEditable: true,
    detailActiveEditor: EditorType.ElementEditor,
    googleReview: null,
    getScreens: () => {
      return get().screens;
    },
    addScreens: (screens) =>
      set((state) => {
        state.screens = screens;
      }),
    addScreenWithTitle: (title) =>
      set((state) => {
        const newScreenId = `${crypto.randomUUID().replace(/[^a-zA-Z_]/g, "")}_${crypto.randomUUID().replace(/[^a-zA-Z_]/g, "")}`;
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
        let screenIndex = state.screens.length - 1;
        const nextScreen = state.screens[screenIndex];
        state.screens.forEach((s, index) => {
          s.terminal = index === state.screens.length - 1;
          if (index === screenIndex - 1) {
            const footer = s.layout.children.find(
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
          }
        });
        state.currentScreenId = newScreenId;
        state.activeEditor = null;
      }),
    setCurrentElement: (elementId, type) =>
      set((state) => {
        state.currentElementId = elementId;
        state.currentElementType = type;
        state.detailActiveEditor = EditorType.ElementEditor;
        state.activeEditor = EditFlowRightPanel.ElementEditor;
      }),
    setFlowEditable: (editable) =>
      set((state) => {
        state.flowEditable = editable;
      }),
    setActiveEditor: (editor) =>
      set((state) => {
        state.activeEditor = editor;
      }),
    setDetailActiveEditor: (editor) =>
      set((state) => {
        state.detailActiveEditor = editor;
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
    getCurrentElement: () => {
      const state = get();
      return state
        .getCurrentScreen()
        ?.layout.children.find((el) => el.id === state.currentElementId);
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
        state.currentElementType = null;

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
        let { currentScreenId } = state;
        const screen = state.screens.find(
          (screen) => screen.id === currentScreenId,
        );
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
          state.currentElementId = component.id;
        }
      }),

    deleteComponentFromScreen: (id) =>
      set((state) => {
        let { currentScreenId } = state;
        const screen = state.screens.find(
          (screen) => screen.id === currentScreenId,
        );
        if (screen) {
          screen.layout.children = screen.layout.children.filter(
            (el) => el.id !== id,
          );
          if (state.currentElementId === id) {
            state.currentElementId = null;
            state.currentElementType = null;
          }
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
