// Extracted verbatim from `CardDetailPage.tsx`. Behaviour is unchanged.

import {
  IconCheck,
  IconFileText,
  IconPlus,
  IconSquareCheck,
  IconTag,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useBoardsQueries,
  useUpdateCardMutation,
  useLabels,
} from "@/backend/tickets/tickets.query";
import { parseColor } from "@/components/Tickets/card.tsx";
import type { Card, Checklist } from "@/components/Tickets/types.ts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

import { AddItemRow, SectionLabel, useDebounce } from "./shared.tsx";

export function EditTicket({ ticket, ticketId }: Readonly<{ ticket: Card; ticketId: string }>) {
  const { t } = useTranslation();
  const { mutate } = useUpdateCardMutation();
  const [description, setDescription] = useState(ticket.description || "");

  const { data: boards } = useBoardsQueries();
  const currentBoard = (boards || []).find((b) =>
    b.ticketColumns?.some((c) => c.id === ticket.ticketColumnId),
  );
  const { labels } = useLabels(currentBoard?.id ?? "");

  const handleLabelChange = (clickedLabelId: string) => {
    const currentLabelIds = ticket.labels?.map((l) => l.id) || [];
    const isSelected = currentLabelIds.includes(clickedLabelId);

    const newLabelIds = isSelected
      ? currentLabelIds.filter((id: string) => id !== clickedLabelId)
      : [...currentLabelIds, clickedLabelId];

    mutate({ id: ticketId, labelIds: newLabelIds });
  };

  const [debouncedDescription] = useDebounce(description, 1000);

  useEffect(() => {
    if (debouncedDescription !== ticket.description && debouncedDescription !== "") {
      mutate({ id: ticketId, description: debouncedDescription });
    }
  }, [debouncedDescription, ticketId, mutate, ticket.description]);

  const [localChecklists, setLocalChecklists] = useState<Checklist[]>(ticket.checklists || []);
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newClName, setNewClName] = useState("");

  useEffect(() => {
    if (ticket.checklists) {
      setLocalChecklists(ticket.checklists);
    }
  }, [ticket.checklists]);

  const updateChecklists = (newChecklists: Checklist[]) => {
    setLocalChecklists(newChecklists);
    mutate({ id: ticketId, checklists: newChecklists });
  };

  const addChecklist = () => {
    if (!newClName.trim()) return;
    updateChecklists([
      ...localChecklists,
      { id: crypto.randomUUID(), name: newClName.trim(), items: [] },
    ]);
    setNewClName("");
    setAddingChecklist(false);
  };

  const deleteChecklist = (clId: string) => {
    updateChecklists(localChecklists.filter((cl) => cl.id !== clId));
  };

  const addItem = (clId: string, text: string) => {
    updateChecklists(
      localChecklists.map((cl) =>
        cl.id !== clId
          ? cl
          : {
              ...cl,
              items: [...cl.items, { id: crypto.randomUUID(), text, done: false }],
            },
      ),
    );
  };

  const toggleItem = (clId: string, itemId: string) => {
    updateChecklists(
      localChecklists.map((cl) =>
        cl.id !== clId
          ? cl
          : {
              ...cl,
              items: cl.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
            },
      ),
    );
  };

  const deleteItem = (clId: string, itemId: string) => {
    updateChecklists(
      localChecklists.map((cl) =>
        cl.id !== clId ? cl : { ...cl, items: cl.items.filter((i) => i.id !== itemId) },
      ),
    );
  };

  return (
    <div className="flex flex-col gap-8 shrink-0">
      {/* Description Editor */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <IconFileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-body text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
            {t("Description")}
          </span>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("Add a description...")}
          className="min-h-20 bg-muted/30 resize-y"
        />
      </div>

      {/* Labels */}
      <div>
        <SectionLabel label={t("Labels")} icon={IconTag} />
        <div className="mt-[9px] flex flex-wrap items-center gap-1.5">
          {ticket.labels?.map((label) => {
            const pColor = parseColor(label.color);
            return (
              <button
                key={label.id}
                onClick={() => handleLabelChange(label.id)}
                className="rounded-full flex items-center gap-[3px] cursor-pointer transition-all duration-150 hover:opacity-80 group border-none px-3 py-0.5"
                style={{
                  background: pColor.bgcolor,
                  color: pColor.textcolor,
                }}
              >
                <span className="text-xs">{label.name}</span>
                <IconX size={11} className="opacity-50 group-hover:opacity-100" strokeWidth={2.5} />
              </button>
            );
          })}

          <Popover>
            <PopoverTrigger
              render={
                <button className="flex items-center gap-[3px] px-3 py-0.5 rounded-full border-[1.5px] border-dashed border-muted-foreground/60 bg-transparent font-body text-[11px] font-semibold text-muted-foreground/80 transition-all duration-150 hover:border-primary hover:text-primary cursor-pointer" />
              }
            >
              <IconPlus size={10} strokeWidth={2.5} />
              <span className="text-xs">{t("Add label")}</span>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mb-2 px-1 mt-1">
                {t("Board Labels")}
              </div>
              <div
                className="max-h-64 overflow-y-auto flex flex-col gap-1"
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {!labels || labels.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground text-center p-2">
                    {t("No labels found on this board.")}
                  </div>
                ) : (
                  labels.map((label) => {
                    const isSelected = ticket.labels?.some((l) => l.id === label.id);
                    const pColor = parseColor(label.color);
                    return (
                      <button
                        key={label.id}
                        onClick={() => handleLabelChange(label.id)}
                        className="rounded-md flex items-center justify-between px-2.5 py-1.5 transition cursor-pointer text-left w-full text-[11.5px] font-semibold hover:opacity-80 border-none"
                        style={{
                          background: pColor.bgcolor,
                          color: pColor.textcolor,
                        }}
                      >
                        {label.name}
                        {isSelected && <IconCheck size={12} strokeWidth={3} />}
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Checklists */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <SectionLabel label={t("Checklists")} icon={IconSquareCheck} />
          <button
            onClick={() => setAddingChecklist(true)}
            className="font-body text-xs font-semibold text-primary bg-primary/10 border-none rounded-md cursor-pointer flex items-center gap-1 transition-colors hover:bg-primary/20"
            style={{ padding: "4px 10px" }}
          >
            <IconPlus size={12} strokeWidth={2.5} /> {t("Add checklist")}
          </button>
        </div>

        {localChecklists.length === 0 && !addingChecklist && (
          <div className="p-3.5 bg-muted/30 rounded-lg border-[1.5px] border-dashed border-border font-body text-[13px] text-muted-foreground text-center">
            {t("No checklists yet — add one above")}
          </div>
        )}

        {localChecklists.map((cl, clIdx) => {
          const clDone = cl.items.filter((i) => i.done).length;
          const clTotal = cl.items.length;
          const pct = clTotal > 0 ? Math.round((clDone / clTotal) * 100) : 0;

          return (
            <div
              key={cl.id}
              className="bg-ink-25 dark:bg-muted/20 rounded-[10px] border border-border p-3.5"
              style={{
                marginBottom: clIdx < localChecklists.length - 1 ? 20 : 8,
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: clTotal > 0 ? 8 : 10 }}
              >
                <IconSquareCheck size={14} className="text-muted-foreground" strokeWidth={2} />
                <span className="font-body font-bold text-[13px] text-foreground flex-1">
                  {cl.name}
                </span>
                {clTotal > 0 && (
                  <span
                    className={`font-body text-[11px] font-semibold ${clDone === clTotal ? "text-green-600" : "text-muted-foreground"}`}
                  >
                    {pct}%
                  </span>
                )}
                <button
                  onClick={() => deleteChecklist(cl.id)}
                  className="w-[22px] h-[22px] rounded-[5px] border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
                >
                  <IconTrash size={12} strokeWidth={2} />
                </button>
              </div>

              {clTotal > 0 && (
                <div className="h-1 bg-border rounded-full overflow-hidden mb-2.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${clDone === clTotal ? "bg-green-600" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              <div className="flex flex-col gap-px">
                {cl.items.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 rounded-[7px] transition-colors duration-150 hover:bg-muted/50 relative"
                    style={{ padding: "5px 8px" }}
                  >
                    <div
                      onClick={() => toggleItem(cl.id, item.id)}
                      className={`w-[17px] h-[17px] rounded-[5px] shrink-0 flex items-center justify-center cursor-pointer transition-all duration-150 ${item.done ? "bg-green-600 border-none" : "bg-transparent border-2 border-border"}`}
                    >
                      {item.done && <IconCheck size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span
                      onClick={() => toggleItem(cl.id, item.id)}
                      className="font-body text-[13px] flex-1 cursor-pointer transition-all duration-150"
                      style={{
                        color: item.done ? "var(--muted-foreground)" : "var(--foreground)",
                        textDecoration: item.done ? "line-through" : "none",
                      }}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteItem(cl.id, item.id)}
                      className="w-[18px] h-[18px] rounded border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute right-1.5 hover:text-destructive"
                    >
                      <IconX size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>

              <AddItemRow onAdd={(text) => addItem(cl.id, text)} />
            </div>
          );
        })}

        {addingChecklist && (
          <div
            className="flex gap-2 items-center bg-primary/5 rounded-[10px] border-[1.5px] border-primary/20 mt-2"
            style={{ padding: "10px 14px" }}
          >
            <IconSquareCheck size={14} className="text-primary" strokeWidth={2} />
            <input
              autoFocus
              value={newClName}
              onChange={(e) => setNewClName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addChecklist();
                if (e.key === "Escape") {
                  setAddingChecklist(false);
                  setNewClName("");
                }
              }}
              placeholder={t("Checklist name...")}
              className="flex-1 font-body text-[13px] font-semibold border-none outline-none bg-transparent text-foreground"
            />
            <button
              onClick={addChecklist}
              disabled={!newClName.trim()}
              className="font-body text-[13px] font-semibold text-primary-foreground bg-primary border-none rounded-[7px] cursor-pointer disabled:opacity-45"
              style={{ padding: "7px 13px" }}
            >
              {t("Add")}
            </button>
            <button
              onClick={() => {
                setAddingChecklist(false);
                setNewClName("");
              }}
              className="font-body text-[13px] font-semibold text-muted-foreground bg-transparent border-none cursor-pointer hover:text-foreground"
              style={{ padding: "7px 13px" }}
            >
              {t("Cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
