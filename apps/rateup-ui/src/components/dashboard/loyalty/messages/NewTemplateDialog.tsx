import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSaveTemplateAsDraftMutation } from "@/backend/whatsapp/whatsapp.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
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
  loyaltyDraftPayload,
  loyaltyMessageCatalog,
  variableHint,
  type LoyaltyMessageDefinition,
} from "./loyaltyMessageCatalog.ts";
import { MessageBubble } from "./MessageBubble.tsx";

/** The new draft's id, off the axios response the mutation hands back. */
function draftIdOf(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null || !("data" in data)) return undefined;
  const body = (data as { data?: unknown }).data;
  if (typeof body !== "object" || body === null || !("id" in body)) return undefined;
  const id = (body as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

interface NewTemplateDialogProps {
  open: boolean;
  /** Preselected starter; when absent the dialog opens on the picker. */
  starter?: LoyaltyMessageDefinition | null;
  onClose: () => void;
  onCreated?: (templateId: string, starter: LoyaltyMessageDefinition | null) => void;
}

/**
 * A new Meta template for the library: from one of the catalog's starters, or blank in
 * the full editor. Starters become a draft on the chosen WhatsApp account first — Meta
 * approval takes hours and a wrong number is cheap to fix before that.
 */
export function NewTemplateDialog({
  open,
  starter,
  onClose,
  onCreated,
}: Readonly<NewTemplateDialogProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<LoyaltyMessageDefinition | null>(null);
  const [accountId, setAccountId] = useState("");
  const saveDraft = useSaveTemplateAsDraftMutation(
    "",
    () => {},
    () => {},
  );

  const chosen = starter ?? picked;
  const catalog = loyaltyMessageCatalog(t);

  const close = () => {
    setPicked(null);
    setAccountId("");
    onClose();
  };

  const startBlank = () => {
    close();
    navigate({ to: "/dashboard/loyalty/templates/$templateId", params: { templateId: "create" } });
  };

  const create = () => {
    if (!chosen || !accountId) {
      toast.error(t("Pick a WhatsApp account first."));
      return;
    }
    saveDraft.mutate(loyaltyDraftPayload(chosen, accountId), {
      onSuccess: (data) => {
        const templateId = draftIdOf(data);
        close();
        if (templateId) {
          onCreated?.(templateId, chosen);
          navigate({ to: "/dashboard/loyalty/templates/$templateId", params: { templateId } });
        }
      },
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
                  "A draft on the account you pick. The editor opens next — add an image, a footer or buttons there, then submit it to Meta.",
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
            <AccountSelector
              value={accountId}
              onChange={(value) => setAccountId(value ?? "")}
              label={t("WhatsApp account")}
              withAllOption={false}
              optional={false}
            />
            <DialogFooter>
              {!starter && (
                <Button variant="ghost" onClick={() => setPicked(null)}>
                  {t("Back")}
                </Button>
              )}
              <Button variant="outline" onClick={close}>
                {t("Cancel")}
              </Button>
              <Button onClick={create} disabled={saveDraft.isPending || !accountId}>
                {saveDraft.isPending ? t("Creating…") : t("Create draft")}
              </Button>
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
              onClick={startBlank}
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
