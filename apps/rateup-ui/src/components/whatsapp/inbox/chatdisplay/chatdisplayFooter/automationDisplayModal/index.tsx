import { IconLoader2, IconSend } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useChatbots } from "@/backend/chatbots/chatbots.query.ts";
import { useInitiateWaAutomatedReplyMutation } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useInitiateMetaAutomationMutation } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query.ts";
import NothingFound from "@/components/NothingFound/NothingFound.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { cn } from "@/lib/utils.ts";
import { MessagePlatform } from "@/types/enums.ts";
import { AutomationPlatform } from "@/types/platform.ts";
import { getContactWaAddress } from "@/utils/whatsapp/inbox.ts";

interface Props {
  sessionExpired: boolean;
  opened: boolean;
  close: () => void;
  contact: ContactsData | null;
  /** The thread's channel. WhatsApp when not given, as before Instagram and Messenger joined. */
  platform?: MessagePlatform | null;
  /** The Instagram account or Facebook Page the thread runs on; unused on WhatsApp. */
  accountId?: string;
}

const AUTOMATION_PLATFORM: Partial<Record<MessagePlatform, AutomationPlatform>> = {
  [MessagePlatform.WHATSAPP]: AutomationPlatform.WHATSAPP,
  [MessagePlatform.INSTAGRAM]: AutomationPlatform.INSTAGRAM,
  [MessagePlatform.FACEBOOK]: AutomationPlatform.FACEBOOK,
};

/**
 * Starts one of the org's chatbots for the person in this thread, on the thread's own
 * channel: only that channel's chatbots are offered.
 */
export default function WaInboxAutomationDisplayModal(props: Props) {
  const { t } = useTranslation();
  const [selectedAutomationId, setSelectedAutomationId] = useState<string>("");
  const platform = AUTOMATION_PLATFORM[props.platform ?? MessagePlatform.WHATSAPP];
  const isMeta =
    platform === AutomationPlatform.INSTAGRAM || platform === AutomationPlatform.FACEBOOK;

  const { data, isLoading, error } = useChatbots(platform);
  const automations = data?.data;
  const initiateWa = useInitiateWaAutomatedReplyMutation(selectedAutomationId);
  const initiateMeta = useInitiateMetaAutomationMutation(
    platform === AutomationPlatform.FACEBOOK
      ? AutomationPlatform.FACEBOOK
      : AutomationPlatform.INSTAGRAM,
    selectedAutomationId,
  );
  const isPending = initiateWa.isPending || initiateMeta.isPending;

  // Instagram addresses the person by igsId, Messenger by psid.
  const recipientId =
    platform === AutomationPlatform.INSTAGRAM
      ? props.contact?.igsId
      : platform === AutomationPlatform.FACEBOOK
        ? props.contact?.psid
        : getContactWaAddress(props.contact);
  const canSend = Boolean(selectedAutomationId && recipientId && (!isMeta || props.accountId));

  function onClose() {
    setSelectedAutomationId("");
    props.close();
  }

  function handleSendAutomatedReply() {
    if (!recipientId) return;
    const done = { onSuccess: onClose };
    if (isMeta) {
      initiateMeta.mutate({ recipientId, accountId: props.accountId ?? "" }, done);
    } else {
      initiateWa.mutate({ phone: recipientId }, done);
    }
  }

  return (
    <Dialog
      open={props.opened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-full overflow-auto sm:max-w-125">
        <DialogHeader className="items-center">
          <DialogTitle className="text-2xl font-bold">{t("Start a chatbot")}</DialogTitle>
          <DialogDescription>{t("Only this channel's chatbots are listed.")}</DialogDescription>
        </DialogHeader>
        {isLoading && (
          <div className="flex items-center justify-center p-6">
            <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Badge variant="destructive">{t("Error")}</Badge>
          </div>
        )}
        {automations && automations.length > 0 ? (
          <>
            <div className="flex max-h-100 flex-col gap-4 overflow-y-auto p-1">
              <FieldSet>
                <FieldLegend
                  variant="label"
                  className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {t("Select a chatbot")}
                </FieldLegend>
                <RadioGroup value={selectedAutomationId} onValueChange={setSelectedAutomationId}>
                  {automations.map((automation) => (
                    <FieldLabel
                      key={automation.id}
                      htmlFor={automation.id}
                      className={cn(
                        "flex-row cursor-pointer items-center justify-between rounded-lg border p-3 transition-all hover:bg-muted/50",
                        selectedAutomationId === automation.id
                          ? "border-primary bg-primary/5"
                          : "border-border",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <RadioGroupItem value={automation.id} id={automation.id} />
                        <span className="select-none text-xs font-medium">{automation.name}</span>
                      </div>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              </FieldSet>
            </div>
            <div className="mt-4 flex justify-end border-t border-border pt-4">
              <Button disabled={!canSend || isPending} onClick={handleSendAutomatedReply}>
                {isPending ? <IconLoader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                <span>{t("Send")}</span>
                {!isPending && <IconSend className="ml-1.5 h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : (
          !isLoading && <NothingFound text={t("No chatbots on this channel yet")} />
        )}
      </DialogContent>
    </Dialog>
  );
}
