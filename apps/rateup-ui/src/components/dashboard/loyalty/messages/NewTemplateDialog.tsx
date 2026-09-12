import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

import {
  loyaltyMessageCatalog,
  variableHint,
  type LoyaltyMessageDefinition,
} from "./loyaltyMessageCatalog.ts";
import { MessageBubble } from "./MessageBubble.tsx";

interface NewTemplateDialogProps {
  open: boolean;
  /** Preselected starter; when absent the dialog opens on the picker. */
  starter?: LoyaltyMessageDefinition | null;
  onClose: () => void;
}

/**
 * Which message a new Meta template starts from — one of the catalog's starters, or
 * nothing at all. Either way it only picks; the WhatsApp template editor opens on the
 * choice and nothing is stored until the merchant saves there, as a draft or to Meta.
 *
 * This used to create the draft itself, on an account chosen here. The editor asks for
 * the account anyway, and the draft endpoint answers without an id, so the template it
 * made could never be handed back to the message that asked for it — every visit left
 * another unattached draft in the library.
 */
export function NewTemplateDialog({ open, starter, onClose }: Readonly<NewTemplateDialogProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<LoyaltyMessageDefinition | null>(null);

  const chosen = starter ?? picked;
  const catalog = loyaltyMessageCatalog(t);

  const close = () => {
    setPicked(null);
    onClose();
  };

  const openEditor = (from: LoyaltyMessageDefinition | null) => {
    close();
    navigate({
      to: "/dashboard/loyalty/templates/$templateId",
      params: { templateId: "create" },
      search: { starter: from?.templateName },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className={chosen ? undefined : "max-w-3xl"}>
        <DialogHeader>
          <DialogTitle>{chosen ? chosen.label : t("New template")}</DialogTitle>
          <DialogDescription>
            {chosen
              ? t(
                  "The WhatsApp template editor opens on these words. Add an image, a footer or buttons there, then save it as a draft or submit it to Meta.",
                )
              : t("Start from one of the program's messages, or from a blank template.")}
          </DialogDescription>
        </DialogHeader>

        {chosen ? (
          <>
            <MessageBubble text={chosen.body} />
            {chosen.params.length > 0 && (
              <p className="font-mono text-[11px] text-muted-foreground">
                {variableHint(chosen.params)}
              </p>
            )}
            <DialogFooter>
              {!starter && (
                <Button variant="ghost" onClick={() => setPicked(null)}>
                  {t("Back")}
                </Button>
              )}
              <Button variant="outline" onClick={close}>
                {t("Cancel")}
              </Button>
              <Button onClick={() => openEditor(chosen)}>{t("Open in template editor")}</Button>
            </DialogFooter>
          </>
        ) : (
          <div className="-mx-2 max-h-[70vh] overflow-y-auto overscroll-contain px-2">
            <StarterGroup
              title={t("Automatic messages")}
              items={catalog.filter((entry) => entry.kind === "event")}
              onPick={setPicked}
            />
            <StarterGroup
              title={t("Keyword replies")}
              items={catalog.filter((entry) => entry.kind === "keyword")}
              onPick={setPicked}
            />
            <button
              type="button"
              onClick={() => openEditor(null)}
              className="mt-3 w-full rounded-lg border border-dashed border-border p-3 text-left text-sm text-muted-foreground hover:bg-muted/40"
            >
              <span className="font-medium text-foreground">{t("Start blank")}</span>{" "}
              {t("— header, footer, buttons and all, in the WhatsApp template editor.")}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StarterGroup({
  title,
  items,
  onPick,
}: Readonly<{
  title: string;
  items: LoyaltyMessageDefinition[];
  onPick: (item: LoyaltyMessageDefinition) => void;
}>) {
  return (
    <section className="mb-4 flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.templateName}
            type="button"
            onClick={() => onPick(item)}
            className="flex flex-col gap-1 rounded-lg border border-border p-3 text-left hover:border-primary/40 hover:bg-muted/40"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{item.label}</span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {item.templateName}
              </Badge>
            </span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
