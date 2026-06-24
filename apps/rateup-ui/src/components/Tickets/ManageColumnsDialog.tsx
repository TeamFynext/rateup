import { useEffect, useState } from "react";

import { Columns3, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Column as ColumnType } from "./types.ts";

interface ManageColumnsDialogProps {
  boardId: string;
  columns: ColumnType[];
  onClose: () => void;
  onSave: (newColumns: any[], deletedIds: string[]) => void;
}

export function ManageColumnsDialog({
  boardId,
  columns,
  onClose,
  onSave,
}: ManageColumnsDialogProps) {
  const { t } = useTranslation();
  // Map internal columns to a generic shape that handles "new" vs "existing"
  const [localCols, setLocalCols] = useState<
    {
      id: string;
      title: string;
      color?: string;
      isNew?: boolean;
      ticketCardsCount?: number;
    }[]
  >([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState("#8B8E8A");

  useEffect(() => {
    setLocalCols(
      columns.map((c) => ({
        id: c.id,
        title: c.title,
        color: (c as any).color || "#8B8E8A",
        isNew: false,
        ticketCardsCount: c._count?.ticketCards ?? c.ticketCards?.length ?? 0,
      })),
    );
  }, [columns]);

  const updateCol = (id: string, patch: Partial<(typeof localCols)[0]>) => {
    setLocalCols((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  const deleteCol = (id: string, isNew?: boolean) => {
    if (!isNew) {
      setDeletedIds((prev) => [...prev, id]);
    }
    setLocalCols((prev) => prev.filter((c) => c.id !== id));
  };

  const addColumn = () => {
    if (!newTitle.trim()) return;
    const id = `col-new-${Date.now()}`;
    setLocalCols((prev) => [
      ...prev,
      {
        id,
        title: newTitle.trim(),
        color: newColor,
        isNew: true,
        ticketCardsCount: 0,
      },
    ]);
    setNewTitle("");
    setNewColor("#8B8E8A");
    setAddingNew(false);
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    setLocalCols((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleSave = () => {
    onSave(localCols, deletedIds);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: "rgba(8,28,63,.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-background rounded-[18px] w-[520px] max-h-[85vh] flex flex-col animate-modal-in"
        style={{ boxShadow: "0 32px 80px rgba(11,31,72,.24)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 shrink-0"
          style={{ padding: "24px 28px 0" }}
        >
          <div
            className="w-[42px] h-[42px] rounded-xl flex items-center justify-center"
            style={{ background: "#1C518E18" }}
          >
            <Columns3 size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-display font-extrabold text-xl text-foreground">
              {t("Manage Columns")}
            </div>
            <div className="font-body text-[13px] text-muted-foreground">
              {t("Add, rename, reorder, or remove columns")}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-[7px] border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center transition-colors hover:bg-muted"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Column list */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: "20px 28px" }}
        >
          <div className="flex flex-col gap-2">
            {localCols.map((col, idx) => (
              <div
                key={col.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => {
                  setDragIdx(null);
                  setDragOverIdx(null);
                }}
                className="group flex items-center gap-2.5 rounded-[10px] border transition-all duration-150"
                style={{
                  padding: "10px 12px",
                  background:
                    dragOverIdx === idx ? "var(--muted)" : "var(--background)",
                  borderColor:
                    dragOverIdx === idx ? "var(--primary)" : "var(--border)",
                  opacity: dragIdx === idx ? 0.4 : 1,
                }}
              >
                <div className="cursor-grab text-muted-foreground hover:text-foreground transition-colors">
                  <GripVertical size={16} strokeWidth={1.75} />
                </div>

                {/* Color Dot */}
                <div
                  className="w-[20px] h-[20px] rounded-full shrink-0 border-[3px] border-background shadow-[0_0_0_1px_var(--border)]"
                  style={{ backgroundColor: col.color || "#8B8E8A" }}
                />

                {/* Name input */}
                <input
                  value={col.title}
                  onChange={(e) => updateCol(col.id, { title: e.target.value })}
                  className="flex-1 font-body text-[13px] font-semibold text-foreground border-none outline-none bg-transparent"
                  style={{ padding: "2px 0" }}
                />

                {/* Ticket Count */}
                <span
                  className="font-body text-[11px] font-bold rounded-full text-muted-foreground bg-muted"
                  style={{ padding: "2px 8px" }}
                >
                  {col.ticketCardsCount || 0}
                </span>

                {/* Delete */}
                <button
                  onClick={() => deleteCol(col.id, col.isNew)}
                  className="w-[26px] h-[26px] rounded-[6px] border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>

          {/* Add new column */}
          {addingNew ? (
            <div
              className="flex items-center gap-2.5 rounded-[10px] border-[1.5px] border-primary/40 bg-primary/5 mt-3"
              style={{ padding: "10px 12px" }}
            >
              {/* Color Dot */}
              <div
                className="w-[20px] h-[20px] rounded-full shrink-0 border-[3px] border-background shadow-[0_0_0_1px_var(--border)] ml-[26px]"
                style={{ backgroundColor: newColor || "#8B8E8A" }}
              />

              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addColumn();
                  if (e.key === "Escape") {
                    setAddingNew(false);
                    setNewTitle("");
                  }
                }}
                placeholder={t("Column name…")}
                className="flex-1 font-body text-[13px] font-semibold text-foreground border-none outline-none bg-transparent"
                style={{ padding: "2px 0" }}
              />

              <button
                onClick={addColumn}
                disabled={!newTitle.trim()}
                className="font-body text-[12px] font-bold text-primary-foreground bg-primary border-none rounded-md cursor-pointer disabled:opacity-45 hover:opacity-90"
                style={{ padding: "5px 12px" }}
              >
                {t("Add")}
              </button>
              <button
                onClick={() => {
                  setAddingNew(false);
                  setNewTitle("");
                  setEditingId(null);
                }}
                className="font-body text-[12px] font-semibold text-muted-foreground bg-transparent border-none cursor-pointer hover:text-foreground"
                style={{ padding: "5px 8px" }}
              >
                {t("Cancel")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingNew(true)}
              className="w-full mt-3 rounded-[10px] border-[1.5px] border-dashed border-border bg-transparent text-muted-foreground font-body text-[13px] font-medium cursor-pointer flex items-center justify-center gap-[5px] transition-all duration-150 hover:border-primary/50 hover:text-primary hover:bg-primary/5"
              style={{ padding: "11px 12px" }}
            >
              <Plus size={14} strokeWidth={2.5} /> {t("Add Column")}
            </button>
          )}

          {localCols.length === 0 && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border-[1.5px] border-dashed border-border font-body text-[13px] text-muted-foreground text-center">
              {t("No columns — add at least one column to use this board")}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-2.5 justify-end shrink-0 border-t border-border"
          style={{ padding: "16px 28px" }}
        >
          <button
            onClick={onClose}
            className="font-body text-[13px] font-semibold text-primary bg-background border-[1.5px] border-primary/20 rounded-[7px] cursor-pointer hover:bg-muted"
            style={{ padding: "8px 16px" }}
          >
            {t("Cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={localCols.length === 0}
            className="font-body text-[13px] font-semibold text-primary-foreground bg-primary border-none rounded-[7px] cursor-pointer flex items-center gap-[5px] disabled:opacity-45 hover:opacity-90"
            style={{
              padding: "8px 16px",
              boxShadow:
                "0 1px 2px rgba(11,31,72,.12),0 4px 12px rgba(28,81,142,.16)",
            }}
          >
            <Columns3 size={14} strokeWidth={2} /> {t("Save Columns")}
          </button>
        </div>
      </div>
    </div>
  );
}
