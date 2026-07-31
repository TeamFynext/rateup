// Shared helpers for the modules in `./`.
// Extracted verbatim from `CardDetailPage.tsx`. Behaviour is unchanged.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { deleteCard, moveCard } from "@/backend/tickets/tickets.api";
import { ticketKeys } from "@/backend/tickets/tickets.keys";
import { cardKeys } from "@/backend/whatsapp/automation.keys";
import type { WaFlowQuestion } from "@/components/Survey/Response/WaResponses.tsx";
import { QuestionType, WaQuestions } from "@/types/enums.ts";
import type { WaFlowForm, WaFlowFormElement } from "@/types/global";

export function useDebounce<T>(value: T, delay: number): [T] {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return [debouncedValue];
}

export function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-body text-[11px] font-bold text-muted-foreground tracking-[0.07em] uppercase mb-[7px]">
      {children}
    </div>
  );
}

export function DateRow({
  label,
  value,
  warn,
  color,
}: Readonly<{
  label: string;
  value: string | Date | null | undefined;
  warn?: boolean;
  color?: string;
}>) {
  const fmt = value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex justify-between items-center">
      <span className="font-body text-xs text-muted-foreground">{label}</span>
      {fmt ? (
        <span
          className={`font-body text-xs font-semibold flex items-center gap-1 ${!color && warn ? "text-red-600" : ""}`}
          style={{ color: color || undefined }}
        >
          {warn && (
            <AlertCircle
              size={11}
              className={!color ? "text-red-600" : undefined}
              style={{ color: color || undefined }}
              strokeWidth={2}
            />
          )}
          {fmt}
        </span>
      ) : (
        <span className="font-body text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

export function SectionLabel({ label, icon: Icon }: { label: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-1.5 mb-3.5">
      {Icon && <Icon size={14} className="text-muted-foreground" strokeWidth={2} />}
      <span className="font-body text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
        {label}
      </span>
    </div>
  );
}

export function AddItemRow({ onAdd }: { onAdd: (text: string) => void }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");

  const commit = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };

  if (!active && !text) {
    return (
      <button
        onClick={() => setActive(true)}
        className="font-body text-xs text-muted-foreground bg-transparent border-none cursor-pointer flex items-center gap-1 rounded-md transition-all duration-150 hover:bg-muted hover:text-primary mt-2"
        style={{ padding: "5px 8px" }}
      >
        <Plus size={11} strokeWidth={2.5} /> {t("Add an item")}
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center mt-2" style={{ padding: "4px 8px" }}>
      <div className="w-[17px] h-[17px] rounded-[5px] border-2 border-muted-foreground/30 shrink-0" />
      <input
        autoFocus={active}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setActive(false);
            setText("");
          }
        }}
        onBlur={() => {
          commit();
          setActive(false);
        }}
        placeholder={t("Add an item...")}
        className="flex-1 font-body text-[13px] border-none border-b-[1.5px] border-b-primary outline-none bg-transparent"
        style={{ padding: "2px 0" }}
      />
      {text && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            commit();
          }}
          className="font-body text-[11px] font-bold text-primary bg-primary/10 border-none rounded-md cursor-pointer"
          style={{ padding: "3px 8px" }}
        >
          {t("Add")}
        </button>
      )}
    </div>
  );
}

/**
 * The ticket view reads element-level fields off a screen's layout children.
 * Flows built by the v2 editor put elements there directly, so the element
 * fields may or may not be present on a given child.
 */
export type FlowLayoutChild = Omit<WaFlowForm, "type"> &
  Partial<Omit<WaFlowFormElement, "type">> & {
    type: string;
    metaType?: WaQuestions | QuestionType;
    header?: string;
  };

/** A flow question as this page derives it, keeping the element's `name`. */
export type FlowQuestionSummary = WaFlowQuestion & { name?: string };

export function useDeleteCardMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.boards() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.board() });
      onSuccess?.();
    },
  });
}

export function useMoveCardColumnMutation(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { cardId: string; sourceColumnId: string; targetColumnId: string }) =>
      moveCard(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.boards() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.board() });
      toast.success("Column updated!", { id: "move-col-success" });
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to move card.", {
        id: "move-col-error",
      });
    },
  });
}
