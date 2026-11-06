// Shared building blocks for the per-node editors in `./`.
//
// Extracted verbatim from `node-editor.tsx` when the 22 node editors were split out of it.
// Behaviour is unchanged.

import { useFormContext } from "react-hook-form";

/** A row inside a list-message section. */
export interface ListRow {
  title?: string;
  description?: string;
}

/** A team member, as the automation assign-node options endpoint returns it. */
export interface AutomationUser {
  id: string;
  name: string;
  teams: Array<{ team_id?: string; team_name?: string }>;
}

import type { LeadgenNodeData, NodeType, NodeTypeMap } from "../../types/node-types.ts";

// Tailwind class map (replaces the former node-editor.module.css)
export const styles = {
  nodeEditor:
    "absolute right-0 top-0 z-10 flex h-full w-[340px] flex-col border-l border-border bg-card text-card-foreground shadow-[-8px_0_24px_rgba(0,0,0,0.12)]",
  editorHeader: "flex items-center justify-between gap-2 border-b border-border px-4 py-3.5",
  editorHeaderTitle: "flex min-w-0 items-center gap-2 text-[15px] font-semibold",
  editorHeaderDot: "size-2 shrink-0 rounded-full",
  closeButton:
    "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
  editorContent: "flex-1 overflow-y-auto p-4",
  editorSection: "mb-5 flex flex-col gap-2",
  editorFooter: "flex justify-end border-t border-border p-4",
  optionRow: "mb-2 flex",
  conditionalHelp: "mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground",
  contactSection: "rounded-md border border-border bg-muted",
  sectionContainer: "rounded-md border border-border",
  rowContainer: "rounded-md bg-muted",
} as const;

// Define props type for all node components
export type FieldErrors = Record<string, { message?: string } | undefined>;

/** Read the inline error message for a given field name from the RHF context. */
export function useFieldError(name: string): string | undefined {
  const { formState } = useFormContext();
  return (formState.errors as FieldErrors)[name]?.message;
}

/** Inline error message for fields that aren't wrapped in a shadcn Field (rich
 * text, dynamic arrays, etc.). */
export function FieldMsg({ name, message }: Readonly<{ name?: string; message?: string }>) {
  const contextError = useFieldError(name ?? "");
  const text = message ?? (name ? contextError : undefined);
  if (!text) return null;
  return <p className="text-xs font-normal text-destructive">{text}</p>;
}

export interface NodeComponentProps<T extends NodeType> {
  nodeData: NodeTypeMap[T];
  handleInputChange: (key: keyof NodeTypeMap[T], value: unknown) => void;
}

// TemplateNode Component
/** A saved graph's node data is untyped JSON; this narrows the leadgen one. */
export function isLeadgenNodeData(data: unknown): data is LeadgenNodeData {
  return typeof data === "object" && data !== null && "leadgenFormId" in data;
}
