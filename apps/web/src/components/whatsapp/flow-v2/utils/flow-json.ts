import type { WaFlowJson } from "@/types/global";

import type { Screen } from "./store.ts";

/**
 * The v1 and v2 flow editors write two dialects into the same `json` column: v1 nests a
 * screen's elements inside a `Form`, v2 stores them directly under `layout.children`.
 * `WaFlowJson` describes the v1 dialect, so these two functions are the single crossing
 * point where a v2 document is read out of, and written back into, that shared type.
 * Everything downstream works against the editor's own `Screen`/`FormElement`.
 */
export const readEditorScreens = (json: WaFlowJson | undefined): Screen[] =>
  (json?.screens ?? []) as unknown as Screen[];

export const writeEditorScreens = (screens: Screen[]): WaFlowJson["screens"] =>
  screens as unknown as WaFlowJson["screens"];
