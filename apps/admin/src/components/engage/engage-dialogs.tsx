import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rateup/ui/components/dialog";
import { Input } from "@rateup/ui/components/input";
import { Label } from "@rateup/ui/components/label";
import { Skeleton } from "@rateup/ui/components/skeleton";
import type { UseQueryResult } from "@tanstack/react-query";
import { useId, useState } from "react";

import type { CustomerChannel, EmailPreview, TestSendInput } from "@/api/engage.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { FilterChips } from "@/components/ds/filter-chips";
import { ErrorState } from "@/components/ds/query-states";

/** The rendered email, filled in for the signed-in staff member. */
export function EmailPreviewDialog({
  query,
  onClose,
}: {
  query: UseQueryResult<EmailPreview>;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 rounded-xl p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 pt-6 pr-14 pb-4">
          <DialogTitle className="text-lg">{query.data?.subject ?? "Email preview"}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          {query.isPending ? (
            <Skeleton className="m-6 h-96" />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} className="m-6" />
          ) : query.data.html ? (
            // Sandboxed with nothing allowed: the email is ours, but links must not navigate here.
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={query.data.html}
              className="h-[70dvh] w-full bg-background"
            />
          ) : (
            <pre className="max-h-[70dvh] overflow-auto px-6 py-5 font-sans text-sm whitespace-pre-wrap">
              {query.data.text ?? "Nothing to preview yet."}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Sends one copy to the staff member's own inbox, or to a WhatsApp number they type. */
export function TestSendDialog({
  title,
  channels,
  pending,
  error,
  onSend,
  onClose,
}: {
  title: string;
  channels: CustomerChannel[];
  pending: boolean;
  error: unknown;
  onSend: (input: TestSendInput, onSuccess: () => void) => void;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<CustomerChannel>(channels[0] ?? "EMAIL");
  const [phone, setPhone] = useState("");
  const phoneId = useId();
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title={title}
      description={
        channel === "EMAIL"
          ? "Goes to your own staff address, filled in with your name, with [Test] in the subject."
          : "Goes from RateUp's WhatsApp number to the number below."
      }
      submitLabel="Send test"
      requireReason={false}
      blocked={channel === "WHATSAPP" && phone.trim().length < 8 && "Enter a phone number"}
      pending={pending}
      error={error}
      onSubmit={() =>
        onSend({ channel, phone: channel === "WHATSAPP" ? phone.trim() : undefined }, () =>
          done("Test sent.", onClose),
        )
      }
    >
      {channels.length > 1 && (
        <FilterChips
          chips={[
            { value: "EMAIL", label: "Email" },
            { value: "WHATSAPP", label: "WhatsApp" },
          ]}
          value={channel}
          onChange={setChannel}
        />
      )}
      {channel === "WHATSAPP" && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor={phoneId}>Phone number</Label>
            <Input
              id={phoneId}
              autoFocus
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="h-9 rounded-lg"
            />
          </div>
          <Notice tone="info">
            Outside a 24-hour window Meta only delivers the template if it is approved.
          </Notice>
        </>
      )}
    </ActionDialog>
  );
}
