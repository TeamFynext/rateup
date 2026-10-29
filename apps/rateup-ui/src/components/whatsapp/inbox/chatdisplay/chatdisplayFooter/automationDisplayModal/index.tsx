import {
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconCheck,
  IconMessageChatbot,
  IconPlayerPlay,
  IconSearch,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ChatbotSummary } from "@/backend/chatbots/chatbots.api.ts";
import { useChatbots, useInitiateChatbotMutation } from "@/backend/chatbots/chatbots.query.ts";
import { useRunsLabel, useStepLabel } from "@/components/dashboard/chatbots/ChatbotCards.tsx";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
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

const CHANNELS = {
  [MessagePlatform.WHATSAPP]: {
    platform: AutomationPlatform.WHATSAPP,
    label: "WhatsApp",
    param: "whatsapp",
    colorClass: "channel-whatsapp",
    icon: IconBrandWhatsapp,
  },
  [MessagePlatform.INSTAGRAM]: {
    platform: AutomationPlatform.INSTAGRAM,
    label: "Instagram",
    param: "instagram",
    colorClass: "channel-instagram",
    icon: IconBrandInstagram,
  },
  [MessagePlatform.FACEBOOK]: {
    platform: AutomationPlatform.FACEBOOK,
    label: "Messenger",
    param: "messenger",
    colorClass: "channel-messenger",
    icon: IconBrandMessenger,
  },
} as const;

/** A search box shows once there are more chatbots than this. */
const SEARCH_FROM = 5;

/**
 * Starts one of the org's chatbots for the person in this thread, on the thread's own
 * channel. Only that channel's chatbots that are switched on are offered.
 */
export default function WaInboxAutomationDisplayModal(props: Props) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const channel =
    CHANNELS[(props.platform ?? MessagePlatform.WHATSAPP) as keyof typeof CHANNELS] ??
    CHANNELS[MessagePlatform.WHATSAPP];
  const { platform } = channel;
  const ChannelIcon = channel.icon;
  const isMeta = platform !== AutomationPlatform.WHATSAPP;

  const { data, isLoading, isError, refetch } = useChatbots(platform);
  const all = data?.data ?? [];
  // A switched-off chatbot can't be started, so it isn't offered.
  const active = useMemo(() => all.filter((chatbot) => chatbot.isActive), [all]);
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? active.filter((chatbot) => chatbot.name.toLowerCase().includes(term)) : active;
  }, [active, search]);
  const initiate = useInitiateChatbotMutation(selectedId);

  // Instagram addresses the person by igsId, Messenger by psid.
  const recipientId =
    platform === AutomationPlatform.INSTAGRAM
      ? props.contact?.igsId
      : platform === AutomationPlatform.FACEBOOK
        ? props.contact?.psid
        : getContactWaAddress(props.contact);
  const reachable = Boolean(recipientId && (!isMeta || props.accountId));
  const canSend = Boolean(selectedId && reachable);
  const contactName = props.contact?.name?.trim() || t("this contact");

  function onClose() {
    setSelectedId("");
    setSearch("");
    props.close();
  }

  function start() {
    if (!recipientId) return;
    initiate.mutate(
      { recipientId, ...(isMeta && { accountId: props.accountId }) },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open={props.opened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className={cn(channel.colorClass, "flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg")}
      >
        <DialogHeader className="flex-row items-center gap-3 px-6 pt-6 pb-4 text-left">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ch-soft text-ch">
            <ChannelIcon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-0.5">
            <DialogTitle className="text-base font-semibold">{t("Start a chatbot")}</DialogTitle>
            <DialogDescription className="truncate text-sm">
              {t("Sends its first message to {name} on {channel}.", {
                name: contactName,
                channel: channel.label,
              })}
            </DialogDescription>
          </div>
        </DialogHeader>

        {active.length > SEARCH_FROM && (
          <div className="px-6 pb-3">
            <InputGroup>
              <InputGroupAddon>
                <IconSearch aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Search chatbots...")}
                aria-label={t("Search chatbots...")}
              />
            </InputGroup>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-3 py-3">
          {isLoading ? (
            <div className="flex flex-col gap-2 px-3">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyTitle>{t("Couldn't load chatbots")}</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" variant="outline" onClick={() => void refetch()}>
                  {t("Try again")}
                </Button>
              </EmptyContent>
            </Empty>
          ) : active.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-ch-soft text-ch">
                  <IconMessageChatbot />
                </EmptyMedia>
                <EmptyTitle>
                  {all.length
                    ? t("Every {channel} chatbot is switched off", { channel: channel.label })
                    : t("No {channel} chatbots yet", { channel: channel.label })}
                </EmptyTitle>
                <EmptyDescription>
                  {all.length
                    ? t("Switch one on in Chatbots to start it from here.")
                    : t("Create one in Chatbots to start it from here.")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link to="/dashboard/chatbots" search={{ channel: channel.param }} />}
                >
                  {t("Open Chatbots")}
                </Button>
              </EmptyContent>
            </Empty>
          ) : shown.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("No chatbots found matching your search")}
            </p>
          ) : (
            <div role="radiogroup" aria-label={t("Chatbots")} className="flex flex-col gap-2">
              {shown.map((chatbot) => (
                <ChatbotOption
                  key={chatbot.id}
                  chatbot={chatbot}
                  selected={chatbot.id === selectedId}
                  onSelect={() => setSelectedId(chatbot.id)}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="items-center gap-3 border-t border-border px-6 py-4 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {!reachable && !isLoading
              ? t("This contact can't get a chatbot on {channel} yet.", {
                  channel: channel.label,
                })
              : t("The first message goes out right away.")}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button disabled={!canSend} loading={initiate.isPending} onClick={start}>
              <IconPlayerPlay className="mr-1.5 size-4" aria-hidden />
              {t("Start chatbot")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One chatbot: its name, size and use, ticked in the channel's colour when picked. */
function ChatbotOption({
  chatbot,
  selected,
  onSelect,
}: Readonly<{ chatbot: ChatbotSummary; selected: boolean; onSelect: () => void }>) {
  const steps = useStepLabel();
  const runs = useRunsLabel();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left shadow-xs transition-all outline-none focus-visible:ring-2 focus-visible:ring-ch active:scale-[0.99]",
        selected
          ? "border-ch bg-ch-soft ring-1 ring-ch"
          : "border-border bg-card hover:border-ch-border hover:bg-muted/50 hover:shadow-sm",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          selected
            ? "bg-ch text-white"
            : "bg-ch-soft text-ch group-hover:bg-ch group-hover:text-white",
        )}
      >
        <IconMessageChatbot className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{chatbot.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {steps(chatbot.stepCount)} · {runs(chatbot.runs)}
        </span>
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-ch bg-ch text-white" : "border-border group-hover:border-ch",
        )}
        aria-hidden
      >
        {selected && <IconCheck className="size-3.5" stroke={3} />}
      </span>
    </button>
  );
}
