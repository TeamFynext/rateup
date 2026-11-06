import { IconPhone } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  callKeys,
  type CallPermissionState,
  getCallPermission,
  requestCallPermission,
} from "@/backend/whatsapp/calling/calling.api";
import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { usePhoneIdStore } from "@/components/whatsapp/inbox/chatselect/accountSelectorStore.ts";
import { useUser } from "@/context/UserContext.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { dial, useCallStore } from "@/store/call.store.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError.ts";

/**
 * Calls the customer from the number the agent is replying on.
 *
 * WhatsApp only lets a business call someone who has said yes to being called, so the
 * button checks first and, when there is no permission yet, offers to send the request
 * instead — the customer's answer arrives in the thread as a reply.
 */
export default function CallContactButton({
  contact,
}: Readonly<{ contact: ContactWithUpdatedAt }>) {
  const { t } = useTranslation();
  const canReply = useCan("inbox.reply");
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { whatsappSettingsPhoneId: phoneId } = usePhoneIdStore();
  const onCall = useCallStore((s) => s.active !== null);
  const [checking, setChecking] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [permission, setPermission] = useState<CallPermissionState | null>(null);
  const canManageChannels = useCan("channels.manage");
  const navigate = useNavigate();

  // Calling is a per-number switch on Meta's side; until it is on, every call action fails.
  const showCallingDisabled = () =>
    toast.error(t("Calling is turned off for this WhatsApp number"), {
      description: canManageChannels
        ? t("Turn it on in the number's Calling tab under Settings → Channels → WhatsApp.")
        : t("Ask an admin to turn on calling for this number."),
      ...(canManageChannels && {
        action: {
          label: t("Open settings"),
          onClick: () =>
            void navigate({
              to: "/dashboard/settings/channels/$channel",
              params: { channel: "whatsapp" },
            }),
        },
      }),
    });

  if (!canReply || !contact.phone) return null;

  const startCall = async () => {
    if (!phoneId) {
      toast.error(t("Select the number to call from"));
      return;
    }
    setChecking(true);
    try {
      const state = await queryClient.fetchQuery({
        queryKey: callKeys.permission(phoneId, contact.id),
        queryFn: () => getCallPermission({ phoneId, contactId: contact.id }),
        staleTime: 30_000,
      });
      if (!state.canCall) {
        setPermission(state);
        setAskOpen(true);
        return;
      }
      await dial({ phoneId, contactId: contact.id, contactName: contact.name ?? null });
    } catch (error) {
      if (getApiErrorData(error)?.code === "call_permission_required") {
        await queryClient.invalidateQueries({
          queryKey: callKeys.permission(phoneId, contact.id),
        });
        setPermission(null);
        setAskOpen(true);
        return;
      }
      if (getApiErrorData(error)?.code === "calling_disabled") {
        showCallingDisabled();
        return;
      }
      toast.error(getApiErrorMessage(error, t("Could not start the call")));
    } finally {
      setChecking(false);
    }
  };

  const teamId = contact.assignedUsers?.find((u) => u.id === user?.userId)?.teamId ?? null;

  return (
    <>
      <CustomTooltip
        side="bottom"
        content={<p>{onCall ? t("You are already on a call") : t("Call on WhatsApp")}</p>}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("Call on WhatsApp")}
            loading={checking}
            disabled={onCall}
            onClick={() => void startCall()}
          >
            <IconPhone className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      {phoneId && (
        <AskPermissionDialog
          open={askOpen}
          onOpenChange={setAskOpen}
          permission={permission}
          phoneId={phoneId}
          contactId={contact.id}
          teamId={teamId}
        />
      )}
    </>
  );
}

function AskPermissionDialog({
  open,
  onOpenChange,
  permission,
  phoneId,
  contactId,
  teamId,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: CallPermissionState | null;
  phoneId: string;
  contactId: string;
  teamId: string | null;
}>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [body, setBody] = useState(() =>
    t("We'd like to call you on WhatsApp to help with your request. Is that okay?"),
  );
  const [sending, setSending] = useState(false);
  // Meta allows one request a day and two a week per customer; past that it says no.
  const limitReached = permission !== null && !permission.canRequest;

  const send = async () => {
    setSending(true);
    try {
      await requestCallPermission({ phoneId, contactId, body: body.trim(), teamId });
      await queryClient.invalidateQueries({ queryKey: callKeys.permission(phoneId, contactId) });
      toast.success(t("Permission request sent"));
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("Could not send the permission request")));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Ask to call this customer")}</DialogTitle>
          <DialogDescription>
            {limitReached
              ? t(
                  "WhatsApp allows one call request a day and two a week per customer. You can ask again later.",
                )
              : t(
                  "WhatsApp needs the customer's permission before a business can call them. They'll get this message with an option to allow calls.",
                )}
          </DialogDescription>
        </DialogHeader>
        {!limitReached && (
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1024}
            rows={3}
            aria-label={t("Message to the customer")}
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {limitReached ? t("Close") : t("Cancel")}
          </Button>
          {!limitReached && (
            <Button loading={sending} disabled={!body.trim()} onClick={() => void send()}>
              {t("Send request")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
