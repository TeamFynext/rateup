import type { ReactNode } from "react";

/** One selectable option in a flow's data-source list. */
export interface FlowChoice {
  id: string;
  title?: string;
  description?: string;
  metadata?: string;
  image?: string;
}

/**
 * Props shared by the flow-builder's field editors.
 *
 * Each editor is rendered generically from a screen's element definition, so it
 * receives the current value plus the list helpers the choice/carousel editors
 * use. `TValue` is whatever that particular element stores.
 */
export interface FlowInputProps<TValue = unknown> {
  /** The flow question type, when the editor varies its UI by it. */
  metaType?: string;
  /** Restricts the choice editor to titles only. */
  onlyTitle?: boolean;
  /**
   * The stored value. The element editor dispatches to these controls dynamically, so a
   * control receives it unnarrowed and narrows it itself.
   */
  value?: unknown;
  onChange?: (value: TValue) => void;
  label?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  error?: ReactNode;
  errors?: Record<string, { message?: string }>;
  maxCharCount?: number;
  maxChoice?: number;
  maxImages?: number;
  /** List helpers, supplied when the element edits a collection. */
  insertListItem?: (path: string, item: unknown) => void;
  removeListItem?: (path: string, index: number) => void;
}

/**
 * The controls receive their value unnarrowed (see `FlowInputProps.value`). These narrow it to
 * the shape a given control edits; anything else is treated as "not set yet".
 */
export const asList = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const asText = (value: unknown): string => (typeof value === "string" ? value : "");
