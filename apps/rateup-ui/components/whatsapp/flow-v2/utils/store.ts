import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { QuestionType2, WaQuestions } from "@/types/enums";
import { FlowLogicJump } from "@/types/global";

import {
  getQuestionTypeMapping,
  NO_NAME_TYPES,
  NO_VISIBLE_TYPES,
  REQUIRES_NAME_TYPES,
} from "./typeConstants";

export interface Screen {
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
  id?: string;
  type?: QuestionType2;
  required?: boolean;
  label?: string;
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

export enum EditorType {
  LogicEditor = "logic-editor",
  GoogleReviewEditor = "google-review-editor",
  ElementEditor = "element-editor",
  TicketIssueEditor = "ticket-issue-editor",
}

interface StoreState {
  screens: Screen[];
  currentScreenId: string | null;
  currentElementId: string | null;
  expandedElementId: string | null; // For inline editing in column 2
  currentElementType: QuestionType2 | null;
  detailActiveEditor: EditorType;
  logicJumps: { [screenId: string]: FlowLogicJump[] };
  getScreens: () => Screen[];
  addScreens: (screens: Screen[]) => void;
  addScreenWithTitle: (title: string) => void;
  deleteScreen: (screenId: string) => void;
  updateComponentInScreen: (
    id: string,
    updatedComponent: Partial<FormElement>,
  ) => void;
  getScreen: (screenId: string) => Screen | undefined;
  getComponent: (componentName: string) => FormElement | undefined;
  setCurrentScreenId: (screenId: string) => void;
  setCurrentElement: (elementId?: string, type?: QuestionType2) => void;
  setExpandedElementId: (elementId: string | null) => void;
  setDetailActiveEditor: (editor: EditorType) => void;
  getCurrentScreen: () => Screen | undefined;
  getCurrentElement: () => FormElement | undefined;
  updateScreen: (screenId: string, updatedScreen: Partial<Screen>) => void;
  updateComponentsInScreen: (
    screenId: string,
    updatedComponents: FormElement[],
  ) => void;
  addComponentToScreen: (component: FormElement) => void;
  deleteComponentFromScreen: (feId: string) => void;
  ticketIssued: any[];
  setTicketIssued: (ticketIssued: any[]) => void;
  getLogicJumps: (screenId: string) => FlowLogicJump[];
  updateLogicJumps: (screenId: string, jumps: FlowLogicJump[]) => void;
  setAllLogicJumps: (jumps: { [screenId: string]: FlowLogicJump[] }) => void;
}

const useFlowStoreV3 = create<StoreState>()(
  immer((set, get) => ({
    screens: [],
    currentScreenId: null,
    currentElementId: null,
    expandedElementId: null,
    currentElementType: null,
    detailActiveEditor: EditorType.ElementEditor,
    googleReview: null,
    logicJumps: {},
    getScreens: () => {
      const typeMapping = getQuestionTypeMapping();

      return get().screens.map((screen) => ({
        ...screen,
        layout: {
          ...screen.layout,
          children: screen.layout.children.map((child) => {
            const mappedType =
              child.type && typeMapping[child.type as string]
                ? typeMapping[child.type as string]
                : child.type;

            const isNonInteractive =
              NO_NAME_TYPES.has(mappedType as string) ||
              NO_NAME_TYPES.has(child.type as string);

            const isNoVisible =
              NO_VISIBLE_TYPES.has(mappedType as string) ||
              NO_VISIBLE_TYPES.has(child.type as string);

            // Auto-generate name if required and missing
            const name =
              REQUIRES_NAME_TYPES.includes(mappedType as string) && !child.name
                ? `field_${Math.random().toString(36).substring(2, 10)}`
                : child.name;

            const result: any = {
              ...child,
              type: mappedType as QuestionType2,
              ...(name && !isNonInteractive && { name }),
            };

            // Strip 'visible' and 'required' from types that don't support them
            if (isNoVisible) {
              delete result.visible;
              delete result.required;
            }

            // Strip 'required' from all non-interactive types defensively
            if (isNonInteractive) {
              delete result.required;
            }

            return result as FormElement;
          }),
        },
      })) as Screen[];
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
                id: "footer_" + crypto.randomUUID().replace(/[^a-zA-Z_]/g, ""),
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
      }),
    setCurrentElement: (elementId, type) =>
      set((state) => {
        state.currentElementId = elementId;
        state.currentElementType = type;
        state.detailActiveEditor = EditorType.ElementEditor;
      }),
    setExpandedElementId: (elementId) =>
      set((state) => {
        state.expandedElementId = elementId;
        if (elementId) {
          state.currentElementId = elementId;
        }
      }),
    setDetailActiveEditor: (editor) =>
      set((state) => {
        state.detailActiveEditor = editor;
      }),
    setCurrentScreenId: (screenId) =>
      set((state) => {
        state.currentScreenId = screenId;
        state.expandedElementId = null; // Collapse all when switching screens
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
    deleteScreen: (screenId) =>
      set((state) => {
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

        // Select previous screen or first screen
        if (state.currentScreenId === screenId) {
          if (screenIndex > 0) {
            state.currentScreenId = state.screens[screenIndex - 1]?.id;
          } else {
            state.currentScreenId = state.screens[0]?.id;
          }
        }
      }),
    updateScreen: (screenId, updatedScreen) =>
      set((state) => {
        const screen = state.screens.find((screen) => screen.id === screenId);
        if (screen) {
          Object.assign(screen, updatedScreen);
        }
        state.screens.forEach((s, index) => {
          s.terminal = index === state.screens.length - 1;
        });
      }),
    updateComponentsInScreen: (screenId, updatedComponents) =>
      set((state) => {
        const screen = state.screens.find((screen) => screen.id === screenId);
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
          // Insert before footer
          const footerIndex = screen.layout.children.findIndex(
            (el) => el.type === QuestionType2.Footer,
          );
          if (footerIndex !== -1) {
            screen.layout.children.splice(footerIndex, 0, component);
          } else {
            screen.layout.children.push(component);
          }
          state.currentElementId = component.id;
          state.expandedElementId = component.id; // Auto-expand new element
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
            state.expandedElementId = null;
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
    ticketIssued: [],
    getLogicJumps: (screenId) => {
      return get().logicJumps[screenId] || [];
    },
    updateLogicJumps: (screenId, jumps) =>
      set((state) => {
        state.logicJumps[screenId] = jumps;
      }),
    setAllLogicJumps: (jumps) =>
      set((state) => {
        state.logicJumps = jumps;
      }),
    setTicketIssued: (ticketIssued) => set({ ticketIssued }),
  })),
);

export default useFlowStoreV3;
