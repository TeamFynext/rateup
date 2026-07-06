import { Edit, Search, Tag } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useLabels } from "@/backend/tickets/tickets.query.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

import type { Label } from "./types.ts";

const PRESET_COLORS = [
  { bgcolor: "#f8fafc", textcolor: "#64748b" }, // slate 50/500
  { bgcolor: "#fef2f2", textcolor: "#ef4444" }, // red 50/500
  { bgcolor: "#fff7ed", textcolor: "#f97316" }, // orange 50/500
  { bgcolor: "#fffbeb", textcolor: "#f59e0b" }, // amber 50/500
  { bgcolor: "#fefce8", textcolor: "#eab308" }, // yellow 50/500
  { bgcolor: "#f7fee7", textcolor: "#84cc16" }, // lime 50/500
  { bgcolor: "#f0fdf4", textcolor: "#22c55e" }, // green 50/500
  { bgcolor: "#ecfdf5", textcolor: "#10b981" }, // emerald 50/500
  { bgcolor: "#f0fdfa", textcolor: "#14b8a6" }, // teal 50/500
  { bgcolor: "#ecfeff", textcolor: "#06b6d4" }, // cyan 50/500
  { bgcolor: "#e0f2fe", textcolor: "#0ea5e9" }, // sky 50/500
  { bgcolor: "#eff6ff", textcolor: "#3b82f6" }, // blue 50/500
  { bgcolor: "#eef2ff", textcolor: "#6366f1" }, // indigo 50/500
  { bgcolor: "#f5f3ff", textcolor: "#8b5cf6" }, // violet 50/500
  { bgcolor: "#fdf4ff", textcolor: "#d946ef" }, // fuchsia 50/500
  { bgcolor: "#fdf2f8", textcolor: "#ec4899" }, // pink 50/500
];

const parseColor = (c: string) => {
  try {
    const parsed = JSON.parse(c);
    if (parsed && parsed.bgcolor && parsed.textcolor) return parsed;
    return { bgcolor: c, textcolor: "#171717" };
  } catch {
    return { bgcolor: c, textcolor: "#171717" };
  }
};

export function ManageLabels({
  boardId,
  open,
  onOpenChange,
}: Readonly<{
  boardId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>) {
  const { t } = useTranslation();
  const { labels, isLoading, createLabel, updateLabel, deleteLabel, deleteLabels } =
    useLabels(boardId);
  const [search, setSearch] = useState("");

  // "list" | "create" | "edit"
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);

  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const confirm = useConfirm();

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const filteredLabels =
    labels?.filter((l) => l.name.toLowerCase().includes(search.toLowerCase())) || [];

  const handleCreate = () => {
    if (!name) return;
    createLabel({ name, color: JSON.stringify(color) });
    setView("list");
  };

  const handleUpdate = () => {
    if (!name || !editingLabel) return;
    updateLabel({ id: editingLabel.id, label: { name, color: JSON.stringify(color) } });
    setView("list");
  };

  const handleDeleteSelectedLabels = async () => {
    const shouldDelete = await confirm({
      title: t("Are you sure?"),
      description: t(
        "This will delete the selected label(s) and remove them from all associated cards. This action cannot be undone.",
      ),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });

    if (!shouldDelete) return;

    deleteLabels(selectedLabels);
    setSelectedLabels([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setView("list");
        }
        if (onOpenChange) {
          onOpenChange(isOpen);
        }
      }}
    >
      {open === undefined && (
        <DialogTrigger render={<Button variant="outline" size="sm" className="h-9 shrink-0" />}>
          <Tag className="w-4 h-4 sm:mr-2 text-muted-foreground" />
          <span className="hidden sm:inline">{t("Manage Labels")}</span>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[360px] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center font-semibold">
            {view === "list" && t("Labels")}
            {view === "create" && t("Create Label")}
            {view === "edit" && t("Edit Label")}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {view === "list" ? (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("Search labels...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="text-sm font-semibold text-muted-foreground mt-2">{t("Labels")}</div>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {(() => {
                  if (isLoading) {
                    return (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        {t("Loading...")}
                      </div>
                    );
                  }

                  if (filteredLabels.length === 0) {
                    return (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        {t("No labels found")}
                      </div>
                    );
                  }

                  return filteredLabels.map((label) => {
                    const parsedColor = parseColor(label.color);
                    return (
                      <div key={label.id} className="flex items-center gap-3 group">
                        <Checkbox
                          checked={selectedLabels.includes(label.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedLabels([...selectedLabels, label.id]);
                            } else {
                              setSelectedLabels(selectedLabels.filter((id) => id !== label.id));
                            }
                          }}
                        />
                        <div
                          className="flex-1 py-1.5 px-3 rounded-md text-sm font-medium"
                          style={{
                            backgroundColor: parsedColor.bgcolor,
                            color: parsedColor.textcolor,
                            border: `1px solid ${parsedColor.textcolor}`,
                          }}
                        >
                          {label.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => {
                            setEditingLabel(label);
                            setName(label.name);
                            setColor(parsedColor);
                            setView("edit");
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  });
                })()}
              </div>

              {selectedLabels.length > 0 ? (
                <Button
                  variant="destructive"
                  className="w-full mt-2"
                  onClick={handleDeleteSelectedLabels}
                >
                  {t("Delete Selected Labels")} ({selectedLabels.length})
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full mt-2 bg-background hover:bg-muted"
                  onClick={() => {
                    setName("");
                    setColor(PRESET_COLORS[0]);
                    setView("create");
                  }}
                >
                  {t("Create a new label")}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("Name")}</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("Label name")}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("Color")}</label>
                <div className="grid grid-cols-8 gap-2 w-fit">
                  {PRESET_COLORS.map((c, i) => (
                    <button
                      key={i}
                      className={`w-8 h-8 rounded-md transition-all ${color.bgcolor === c.bgcolor ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      style={{ backgroundColor: c.textcolor }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setView("list")}>
                  {t("Cancel")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={view === "create" ? handleCreate : handleUpdate}
                  disabled={!name}
                >
                  {t("Save")}
                </Button>
              </div>
              {view === "edit" && (
                <Button
                  variant="destructive"
                  className="w-full mt-2"
                  onClick={() => {
                    if (editingLabel) deleteLabel(editingLabel.id);
                    setView("list");
                  }}
                >
                  {t("Delete Label")}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
