import { IconAlertTriangle } from "@tabler/icons-react";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";

/** The API refuses a reason shorter than this (staff/orgs/subscription.schema.ts). */
export const MIN_REASON = 5;

/**
 * The frame of every change a staff member makes: what it does, the fields for it, and a
 * required reason that goes on the audit row. The form scrolls inside the dialog, so a
 * long one still fits a phone.
 */
export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitLabel,
  destructive = false,
  wide = false,
  canSubmit = true,
  pending,
  error,
  onSubmit,
  reasonLabel = "Reason",
  reasonPlaceholder = "Why, in a sentence. Kept in the audit log; the customer never sees it.",
  initialReason = "",
  requireReason = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  submitLabel: string;
  destructive?: boolean;
  wide?: boolean;
  /** False while the fields above the reason are incomplete. */
  canSubmit?: boolean;
  pending: boolean;
  error: unknown;
  /** For a dialog whose text is itself the content, such as a note. */
  reasonLabel?: string;
  reasonPlaceholder?: string;
  initialReason?: string;
  /** False for a confirmation whose subject already says everything, such as deleting a note. */
  requireReason?: boolean;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState(initialReason);
  const reasonId = useId();
  const trimmed = reason.trim();
  const ready = canSubmit && (!requireReason || trimmed.length >= MIN_REASON) && !pending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) setReason(initialReason);
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] flex-col gap-0 rounded-3xl p-0",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <DialogHeader className="px-6 pt-6 pr-14">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (ready) onSubmit(trimmed);
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            {children}
            {requireReason || initialReason ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor={reasonId}>{reasonLabel}</Label>
                <Textarea
                  id={reasonId}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={reasonPlaceholder}
                  maxLength={500}
                  className="min-h-20 rounded-xl"
                />
                {trimmed.length > 0 && trimmed.length < MIN_REASON && (
                  <p className="text-xs text-muted-foreground">A few more words, please.</p>
                )}
              </div>
            ) : null}
            {error != null && (
              <p
                role="alert"
                className="rounded-2xl bg-negative/10 px-4 py-3 text-sm text-negative"
              >
                {getApiErrorMessage(error, "That didn't work.")}
              </p>
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-4"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              className="h-11 rounded-xl px-5"
              disabled={!ready}
            >
              {pending && <Spinner />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Closes the dialog with a confirmation toast. */
export function done(message: string, onClose: () => void) {
  toast.success(message);
  onClose();
}

/** A warning or aside inside a dialog: what else the change touches. */
export function Notice({
  children,
  tone = "warning",
}: {
  children: ReactNode;
  tone?: "warning" | "info";
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-2xl px-4 py-3 text-xs",
        tone === "warning" ? "bg-tone-peach text-foreground/75" : "bg-muted text-muted-foreground",
      )}
    >
      {tone === "warning" && (
        <IconAlertTriangle className="mt-px size-4 shrink-0 text-tone-peach-accent" stroke={1.75} />
      )}
      <span>{children}</span>
    </p>
  );
}
