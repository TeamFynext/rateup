import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { IconGripVertical, IconLink, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { LinktreeLink } from "@/backend/linktree/linktree.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { cn } from "@/lib/utils.ts";

import { AddLinkDialog } from "./AddLinkDialog.tsx";
import { EditLinkDialog } from "./EditLinkDialog.tsx";
import { useLinkPageMutations } from "./useLinkPageMutations.ts";

export function LinksPanel({
  shortUrlId,
  links,
}: Readonly<{ shortUrlId: string; links: readonly LinktreeLink[] }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { saveLinks } = useLinkPageMutations(shortUrlId);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LinktreeLink | null>(null);

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    const next = [...links];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    void saveLinks(next);
  };

  const remove = async (link: LinktreeLink) => {
    const last = links.length === 1;
    const ok = await confirm({
      title: t("Remove {name}?", { name: link.linkDisplayName ?? "" }),
      description: last
        ? t("It's the only link, so the page will be unpublished too.")
        : t("Its click count goes with it."),
      confirmText: t("Remove"),
      cancelText: t("Cancel"),
    });
    if (ok) void saveLinks(links.filter(({ id }) => id !== link.id));
  };

  const addButton = (
    <Button onClick={() => setAdding(true)}>
      <IconPlus data-icon="inline-start" />
      {t("Add link")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3">
      {links.length === 0 ? (
        <Empty className="rounded-lg border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconLink />
            </EmptyMedia>
            <EmptyTitle>{t("No links yet")}</EmptyTitle>
            <EmptyDescription>
              {t("Add a survey, a WhatsApp chat or any web address. Each one becomes a button.")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{addButton}</EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {t("Drag to change the order buttons appear in.")}
            </p>
            {addButton}
          </div>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="link-page-links">
              {(droppable) => (
                <ul
                  ref={droppable.innerRef}
                  {...droppable.droppableProps}
                  className="m-0 flex list-none flex-col gap-2 p-0"
                >
                  {links.map((link, index) => (
                    <Draggable key={link.id} draggableId={link.id} index={index}>
                      {(draggable, snapshot) => (
                        <li
                          ref={draggable.innerRef}
                          {...draggable.draggableProps}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border bg-card p-2 pr-1",
                            snapshot.isDragging && "shadow-lg ring-2 ring-primary/30",
                          )}
                        >
                          <span
                            {...draggable.dragHandleProps}
                            aria-label={t("Reorder {name}", { name: link.linkDisplayName ?? "" })}
                            className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                          >
                            <IconGripVertical className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{link.linkDisplayName}</p>
                            <p className="truncate text-xs text-muted-foreground">{link.linkUrl}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("Edit {name}", { name: link.linkDisplayName ?? "" })}
                            onClick={() => setEditing(link)}
                          >
                            <IconPencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("Remove {name}", { name: link.linkDisplayName ?? "" })}
                            onClick={() => void remove(link)}
                          >
                            <IconTrash />
                          </Button>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {droppable.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        </>
      )}

      <AddLinkDialog
        open={adding}
        onOpenChange={setAdding}
        onAdd={(link) => saveLinks([...links, link])}
      />
      {editing && (
        <EditLinkDialog
          link={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSave={(changed) =>
            saveLinks(links.map((link) => (link.id === changed.id ? changed : link)))
          }
        />
      )}
    </div>
  );
}
