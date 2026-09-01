// The setup guide's sub-nav, as entries for the shared app sidebar.
//
// Like the pipeline's, this builds data rather than markup: `useNavMain` splices
// the result into the "Get started" entry's `items` and `AppSidebar` renders it
// with the same components every other section uses.
//
// Which step is in focus is URL state (`/dashboard/setup?step=`), so every row is
// a plain link and the guide highlights whatever the sidebar points at.

import type { TFunction } from "i18next";

import type { OnboardingChecklist } from "@/backend/org/org.api";
import type { NavEntry, NavProgress } from "@/components/Layout/Navbar/hooks.tsx";

import type { ConnectionState, TaskGroup } from "./setup.tasks.ts";
import { getSetupProgress, SETUP_PATH, setupCopy } from "./setup.tasks.ts";

export interface SetupNavInput {
  /** Passed in rather than hooked: this builds data, so it is not a component. */
  t: TFunction;
  checklist: OnboardingChecklist | undefined;
  /** The org dismissed the guide, or finished every step — the rail entry goes away. */
  dismissed: boolean;
  connected: ConnectionState;
  hasLoyaltyFeature: boolean | null;
  /**
   * The step `/dashboard/setup?step=` is pointing at. Selection is set explicitly
   * because every row shares one path: left to the sidebar's own route matching,
   * the first row of each band would highlight on the bare path.
   */
  activeStep?: string;
}

const GROUP_LABEL: Record<TaskGroup, string> = {
  required: "Required",
  channels: "Channels",
  optional: "Recommended",
};

/**
 * The rows under "Get started", or `[]` when the guide should not be offered at
 * all — which is what hides the rail icon once setup is finished.
 */
export function buildSetupNavItems({
  t,
  checklist,
  dismissed,
  connected,
  hasLoyaltyFeature,
  activeStep,
}: SetupNavInput): NavEntry[] {
  if (dismissed) return [];

  const { visibleTasks, checklistMap, skippedMap, allDone } = getSetupProgress({
    checklist,
    connected,
    hasLoyaltyFeature,
  });

  if (allDone) return [];

  const copy = setupCopy(t);

  const rowsIn = (group: TaskGroup): NavEntry[] =>
    visibleTasks
      // A skipped step is not outstanding, so it has no business in the rail.
      .filter((task) => task.group === group && !skippedMap[task.id])
      .map((task) => ({
        title: copy[task.id].navLabel,
        url: `${SETUP_PATH}?step=${task.id}`,
        // The router's scroll restoration resets to the top on navigation, which
        // landed after the guide had already scrolled to the step and undid it.
        // This row's destination does its own scrolling, so it opts out.
        resetScroll: false,
        icon: task.icon,
        done: Boolean(checklistMap[task.id]),
        isActive: task.id === activeStep,
      }));

  return (["required", "channels", "optional"] as const)
    .map((group) => ({ group: t(GROUP_LABEL[group]), items: rowsIn(group) }))
    .filter((section) => section.items.length > 0);
}

/** The guide's "x of y" meter, for the foot of the section's panel. */
export function buildSetupNavProgress(input: SetupNavInput, t: TFunction): NavProgress | undefined {
  if (input.dismissed) return undefined;

  const { doneTasks, totalTasks, allDone } = getSetupProgress(input);
  if (allDone) return undefined;

  return { label: t("Setup progress"), done: doneTasks, total: totalTasks };
}
