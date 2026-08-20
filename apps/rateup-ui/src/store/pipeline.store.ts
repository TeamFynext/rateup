import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** The five board views, in tab order. */
export const PIPELINE_VIEWS = ["board", "list", "forecast", "insights", "settings"] as const;

export type PipelineView = (typeof PIPELINE_VIEWS)[number];

/** The saved filters in the sidebar's Views section. */
export const LEAD_FILTERS = ["open", "mine", "rotting", "noactivity", "won", "lost"] as const;

export type LeadFilter = (typeof LEAD_FILTERS)[number];

/**
 * The pipeline screen's view state.
 *
 * Only the pipeline id lives in the URL — it is the one thing worth sharing or
 * bookmarking. Which tab you are on, which facet you have picked and which lead
 * you have open are working state, so they are held here instead of turning
 * every click into a query string.
 *
 * The view and the facets survive a reload (see `partialize`), so coming back to
 * the pipeline puts you where you left it.
 */
export interface PipelineViewState {
  view: PipelineView;
  filter: LeadFilter;
  search: string;
  stageId: string | null;
  teamId: string | null;
  source: string | null;
  assigneeId: string | null;
  /** Lead shown in the drawer, or null when it is closed. */
  leadId: string | null;
  createPipelineOpen: boolean;
}

interface PipelineStore extends PipelineViewState {
  patch: (patch: Partial<PipelineViewState>) => void;
  /** Sets a facet, or clears it when it is already the active one. */
  toggle: <K extends "stageId" | "teamId" | "source" | "assigneeId">(
    key: K,
    value: NonNullable<PipelineViewState[K]>,
  ) => void;
  clearFacets: () => void;
}

const INITIAL: PipelineViewState = {
  view: "board",
  filter: "open",
  search: "",
  stageId: null,
  teamId: null,
  source: null,
  assigneeId: null,
  leadId: null,
  createPipelineOpen: false,
};

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set) => ({
      ...INITIAL,
      patch: (patch) => set(patch),
      toggle: (key, value) => set((state) => ({ [key]: state[key] === value ? null : value })),
      clearFacets: () =>
        set({ search: "", stageId: null, teamId: null, source: null, assigneeId: null }),
    }),
    {
      name: "rateup:pipeline:view",
      storage: createJSONStorage(() => localStorage),
      // The server has no `localStorage`, so the first render must match it:
      // stored state is applied after mount, by `usePipelineData`.
      skipHydration: true,
      // Everything the user can see and undo is kept. The open lead and the
      // create dialog are not: restoring them would reopen an overlay nobody
      // asked for, over a lead that may since have been deleted.
      partialize: ({ view, filter, search, stageId, teamId, source, assigneeId }) => ({
        view,
        filter,
        search,
        stageId,
        teamId,
        source,
        assigneeId,
      }),
      // A stored `view` from an older build may name a tab that no longer
      // exists, which would render nothing at all.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PipelineViewState>;
        return {
          ...current,
          ...saved,
          view: PIPELINE_VIEWS.includes(saved.view as PipelineView) ? saved.view! : INITIAL.view,
          filter: LEAD_FILTERS.includes(saved.filter as LeadFilter)
            ? saved.filter!
            : INITIAL.filter,
          // This slot used to hold a lifecycle id. A stored one would now be
          // read as a stage id, match no column, and leave the board looking
          // empty with no visible facet to clear — so old values are dropped.
          stageId: null,
        };
      },
    },
  ),
);
