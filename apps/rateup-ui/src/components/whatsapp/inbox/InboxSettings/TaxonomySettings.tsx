import { IconCheck, IconPencil, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";

import { SettingsPanel } from "./SettingsPanel.tsx";

/**
 * The palette a new row starts from. Literal hex because these are stored on the
 * row and rendered as dynamic `style` values, not theme colours.
 */
const PALETTE = [
  "#dc2626",
  "#c2410c",
  "#b26a00",
  "#16803c",
  "#0e7490",
  "#1c518e",
  "#7a2fa8",
  "#be185d",
] as const;

const DEFAULT_COLOR = PALETTE[5];

/** One row of either taxonomy, in the shape both settings lists render. */
export interface TaxonomyItem {
  id: string;
  name: string;
  color?: string | null;
  /** Rows the item is attached to — conversations for tags, contacts for labels. */
  usageCount?: number;
}

export interface TaxonomySettingsProps {
  title: string;
  /** One line under the title saying what this taxonomy is *for*. */
  description: string;
  addLabel: string;
  /** Suffix after the usage count, e.g. "conversations" / "contacts". */
  usageNoun: string;
  emptyMessage: string;
  items: TaxonomyItem[];
  isLoading?: boolean;
  isSaving?: boolean;
  onCreate: (values: { name: string; color: string }) => void;
  onUpdate: (id: string, values: { name: string; color: string }) => void;
  onDelete: (id: string) => void;
  /** Leading mark for a row — a dot for labels, a `#` for tags. */
  renderMark: (color: string) => React.ReactNode;
}

function ColorPicker({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (color: string) => void }>) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t("Colour")}>
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={value.toLowerCase() === color}
          onClick={() => onChange(color)}
          className={cn(
            "size-5 rounded-full cursor-pointer border-2",
            value.toLowerCase() === color ? "border-foreground" : "border-transparent",
          )}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}

/**
 * The shared editor behind both inbox taxonomies.
 *
 * Contact labels and conversation tags differ only in what they attach to and how
 * a row is marked, so the list, the inline editor and the delete confirmation are
 * written once here and parameterized rather than duplicated per taxonomy.
 */
export default function TaxonomySettings({
  title,
  description,
  addLabel,
  usageNoun,
  emptyMessage,
  items,
  isLoading = false,
  isSaving = false,
  onCreate,
  onUpdate,
  onDelete,
  renderMark,
}: Readonly<TaxonomySettingsProps>) {
  const { t } = useTranslation();
  // `"new"` is the draft row; any other id is that row being edited in place.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [colorDraft, setColorDraft] = useState<string>(DEFAULT_COLOR);
  const [pendingDelete, setPendingDelete] = useState<TaxonomyItem | null>(null);

  const startCreate = () => {
    setEditingId("new");
    setNameDraft("");
    setColorDraft(PALETTE[items.length % PALETTE.length]);
  };

  const startEdit = (item: TaxonomyItem) => {
    setEditingId(item.id);
    setNameDraft(item.name);
    setColorDraft(item.color || DEFAULT_COLOR);
  };

  const cancel = () => setEditingId(null);

  const save = () => {
    const name = nameDraft.trim();
    if (!name || !editingId) return;
    if (editingId === "new") onCreate({ name, color: colorDraft });
    else onUpdate(editingId, { name, color: colorDraft });
    setEditingId(null);
  };

  const editor = (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Input
        autoFocus
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        placeholder={t("Name")}
        className="h-8 max-w-64 flex-1 text-sm"
      />
      <ColorPicker value={colorDraft} onChange={setColorDraft} />
      <div className="ml-auto flex gap-1.5">
        <Button size="sm" className="h-8" onClick={save} disabled={!nameDraft.trim() || isSaving}>
          <IconCheck className="size-3.5" />
          {t("Save")}
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={cancel}>
          <IconX className="size-3.5" />
          {t("Cancel")}
        </Button>
      </div>
    </div>
  );

  return (
    <SettingsPanel
      title={title}
      description={description}
      action={
        <Button size="sm" onClick={startCreate} disabled={editingId === "new"}>
          <IconPlus className="size-4" />
          {addLabel}
        </Button>
      }
    >
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {editingId === "new" && editor}

        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        )}

        {!isLoading && items.length === 0 && editingId !== "new" && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        )}

        {!isLoading &&
          items.map((item) =>
            editingId === item.id ? (
              <div key={item.id}>{editor}</div>
            ) : (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {renderMark(item.color || DEFAULT_COLOR)}
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {item.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.usageCount ?? 0} {usageNoun}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={t("Edit")}
                  onClick={() => startEdit(item)}
                >
                  <IconPencil className="size-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={t("Delete")}
                  onClick={() => setPendingDelete(item)}
                >
                  <IconTrash className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ),
          )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Delete")} “{pendingDelete?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "It will be removed from every {{noun}} it is attached to. This cannot be undone.",
                {
                  noun: usageNoun,
                },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsPanel>
  );
}
