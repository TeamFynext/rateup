import { IconCircleCheck, IconCircleX, IconSparkles } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCloseLeadMutation } from "@/backend/pipeline/pipeline.query.tsx";
import type { Lead, PipelineDetail } from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CloseLeadTarget {
  lead: Lead;
  status: "WON" | "LOST";
}

interface CloseLeadDialogProps {
  target: CloseLeadTarget | null;
  pipeline: PipelineDetail | undefined;
  onClose: () => void;
}

/**
 * Confirms a win or a loss. Losing asks for a reason — that answer is the only
 * input the "where we lose deals" side of insights ever gets, so it is required
 * rather than optional.
 */
export function CloseLeadDialog({ target, pipeline, onClose }: Readonly<CloseLeadDialogProps>) {
  const { t } = useTranslation();
  const closeLead = useCloseLeadMutation();
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const isLost = target?.status === "LOST";
  const reasons = pipeline?.lostReasons ?? [];
  const firstReasonId = reasons[0]?.id ?? null;

  // Reset per lead, not per render: `reasons` is rebuilt on every pass while the
  // pipeline is still loading, so depending on the array itself would re-run
  // this effect and wipe a reason the user had already picked.
  useEffect(() => {
    if (!target) return;
    setReasonId(firstReasonId);
    setNote("");
  }, [target, firstReasonId]);

  const confirm = () => {
    if (!target) return;
    closeLead.mutate(
      {
        leadId: target.lead.id,
        input: {
          status: target.status,
          lostReasonId: isLost ? reasonId : null,
          note: note.trim() || undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                isLost
                  ? "bg-muted text-muted-foreground"
                  : "bg-green-600/10 text-green-700 dark:text-green-500",
              )}
            >
              {isLost ? <IconCircleX className="size-5" /> : <IconCircleCheck className="size-5" />}
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-nunito font-extrabold">
                {isLost ? t("Mark as lost") : t("Mark as won")}
              </DialogTitle>
              <DialogDescription>
                {target?.lead.name}
                {target?.lead.company ? ` · ${target.lead.company}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLost ? (
          <div>
            <div className="text-muted-foreground mb-2 text-[11px] font-extrabold tracking-[0.06em] uppercase">
              {t("Lost reason")}
            </div>
            {reasons.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t(
                  "No lost reasons are configured yet — add some in pipeline settings to track why deals slip.",
                )}
              </p>
            ) : (
              <RadioGroup
                value={reasonId ?? ""}
                onValueChange={(value) => setReasonId(value)}
                className="gap-2"
              >
                {reasons.map((reason) => (
                  <label
                    key={reason.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-[13px] font-medium transition-colors",
                      reasonId === reason.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <RadioGroupItem value={reason.id} />
                    {reason.label}
                  </label>
                ))}
              </RadioGroup>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg bg-green-600/10 p-3 text-green-700 dark:text-green-500">
            <IconSparkles className="size-4 shrink-0" />
            <span className="text-xs font-semibold">
              {t("The lead moves to the won stage and the contact's lifecycle follows it.")}
            </span>
          </div>
        )}

        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("Add a closing note (optional)")}
          className="min-h-16"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            variant={isLost ? "secondary" : "default"}
            onClick={confirm}
            disabled={closeLead.isPending || (isLost && reasons.length > 0 && !reasonId)}
          >
            {isLost ? t("Mark lost") : t("Mark won")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
