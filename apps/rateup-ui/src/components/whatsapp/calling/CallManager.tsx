import {
  IconArrowsDiagonal,
  IconBrandWhatsapp,
  IconMicrophone,
  IconMicrophoneOff,
  IconMinimize,
  IconPhone,
  IconPhoneIncoming,
  IconPhoneOff,
  IconVolume,
} from "@tabler/icons-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { type CallDto, getRingingCalls } from "@/backend/whatsapp/calling/calling.api";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { WS_REOPENED_EVENT } from "@/hooks/useChatSocket.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils.ts";
import {
  abandonCallOnUnload,
  type ActiveCall,
  answer,
  clearLastEnded,
  decline,
  hangUp,
  syncRingingCalls,
  setCallScreenMinimized,
  toggleMute,
  useCallStore,
} from "@/store/call.store.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { formatCallDuration } from "@/utils/whatsapp/callFormat.ts";
import { preloadRingtone, retryRingtone } from "@/utils/whatsapp/callMedia.ts";

/** Backstop for a lost push. A call rings for about a minute, so this is never the only chance. */
const RESYNC_INTERVAL_MS = 10_000;

/**
 * The app-wide call surface. A call opens as a large screen in the middle of the page —
 * ringing or being dialled, it is the one thing that matters right now — and can be
 * minimised to a card in the corner so the agent can read the chat while talking.
 *
 * Mounted once beside the WebSocket handler so it survives navigation: leaving the inbox
 * must not drop a call.
 */
export default function CallManager() {
  const canReply = useCan("inbox.reply");
  const ringing = useCallStore((s) => s.ringing);
  const active = useCallStore((s) => s.active);
  const lastEnded = useCallStore((s) => s.lastEnded);
  const minimized = useCallStore((s) => s.minimized);
  const { t } = useTranslation();

  // The socket pushes rings as they happen; this catches the ones it could not — a tab
  // opened mid-ring, a socket that was reconnecting, a laptop waking from sleep.
  useEffect(() => {
    if (!canReply) return;
    preloadRingtone();
    let inFlight = false;
    const resync = () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      getRingingCalls()
        .then(syncRingingCalls)
        .catch(() => undefined)
        .finally(() => {
          inFlight = false;
        });
    };
    const onVisible = () => document.visibilityState === "visible" && resync();
    resync();
    const timer = setInterval(resync, RESYNC_INTERVAL_MS);
    window.addEventListener(WS_REOPENED_EVENT, resync);
    window.addEventListener("online", resync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener(WS_REOPENED_EVENT, resync);
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [canReply]);

  useEffect(() => {
    if (!lastEnded) return;
    if (lastEnded.status === "REJECTED" && lastEnded.direction === "BUSINESS_INITIATED") {
      toast.info(t("The customer declined the call"));
    } else if (lastEnded.durationSeconds) {
      toast.info(
        t("Call ended · {duration}", { duration: formatCallDuration(lastEnded.durationSeconds) }),
      );
    }
    clearLastEnded();
  }, [lastEnded, t]);

  // Leaving the page ends the call — its audio cannot outlive the tab. Ask first, and if
  // the agent leaves anyway, hang up on the customer instead of leaving them on a dead line.
  const onCall = Boolean(active);
  useEffect(() => {
    if (!onCall) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    window.addEventListener("pagehide", abandonCallOnUnload);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("pagehide", abandonCallOnUnload);
    };
  }, [onCall]);

  const hasCall = Boolean(active) || ringing.length > 0;
  const expanded = hasCall && !minimized;

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCallScreenMinimized(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  if (!canReply || !hasCall) return null;

  // The big screen shows one call: the one this tab is on, else the newest ring. Any other
  // ringing calls wait in the corner, where they can still be answered.
  const focusRinging = active ? null : (ringing[0] ?? null);
  const cornerRinging = expanded ? ringing.filter((c) => c.id !== focusRinging?.id) : ringing;

  return (
    <>
      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Clicking past the screen tucks it away; it never ends the call. */}
          <button
            type="button"
            aria-label={t("Minimise call")}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setCallScreenMinimized(true)}
          />
          <div
            role="dialog"
            aria-label={t("WhatsApp call")}
            className="relative flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-border bg-card px-6 pt-5 pb-8 shadow-2xl"
          >
            <div className="flex w-full items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <IconBrandWhatsapp className="size-4" aria-hidden="true" />
                {t("WhatsApp voice call")}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("Minimise call")}
                onClick={() => setCallScreenMinimized(true)}
              >
                <IconMinimize className="size-4" aria-hidden="true" />
              </Button>
            </div>
            {active ? (
              <ExpandedActiveCall active={active} />
            ) : focusRinging ? (
              <ExpandedRingingCall call={focusRinging} />
            ) : null}
          </div>
        </div>
      )}

      {(!expanded || cornerRinging.length > 0) && (
        <div
          className="fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
          role="region"
          aria-label={t("WhatsApp calls")}
        >
          {!expanded && active && <CompactActiveCall active={active} />}
          {cornerRinging.map((call) => (
            <CompactRingingCall key={call.id} call={call} busy={Boolean(active)} />
          ))}
        </div>
      )}
    </>
  );
}

/* ----------------------------------------------------------------- shared */

function displayName(name: string | null, number: string | null): string {
  return name ?? (number ? `+${number}` : "");
}

function useRingingActions(callId: string) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<"answer" | "decline" | null>(null);

  const run = async (action: "answer" | "decline") => {
    setPending(action);
    try {
      await (action === "answer" ? answer(callId) : decline(callId));
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          action === "answer" ? t("Could not answer the call") : t("Could not decline the call"),
        ),
      );
    } finally {
      setPending(null);
    }
  };

  return { pending, run };
}

function useStatusLine(active: ActiveCall): string {
  const { t } = useTranslation();
  const elapsed = useElapsedSeconds(active.connectedAt);
  return {
    preparing: active.direction === "BUSINESS_INITIATED" ? t("Starting call…") : t("Connecting…"),
    ringing: t("Ringing…"),
    connecting: t("Connecting…"),
    connected: formatCallDuration(elapsed),
  }[active.phase];
}

function useElapsedSeconds(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [since]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
}

/** A large round control with its label underneath, phone-dialler style. */
function RoundAction({
  label,
  onClick,
  tone,
  pressed,
  loading,
  disabled,
  children,
}: Readonly<{
  label: string;
  onClick: () => void;
  tone: "accept" | "end" | "neutral";
  pressed?: boolean;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
}>) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        aria-label={label}
        aria-pressed={pressed}
        loading={loading}
        disabled={disabled}
        onClick={onClick}
        variant={tone === "neutral" ? "outline" : "default"}
        className={cn(
          "size-16 rounded-full [&_svg]:size-7",
          tone === "end" && "bg-destructive text-background hover:bg-destructive/85",
          tone === "neutral" && pressed && "bg-muted",
        )}
      >
        {children}
      </Button>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function CallIdentity({
  name,
  number,
  status,
  ringing,
}: Readonly<{ name: string; number: string | null; status: ReactNode; ringing?: boolean }>) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative">
        {ringing && (
          <span
            className="absolute inset-0 animate-ping rounded-full bg-primary/20"
            aria-hidden="true"
          />
        )}
        <CreativeAvatar name={name} size="xl" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold text-foreground">{name}</p>
        {number && name !== `+${number}` && (
          <p className="text-sm text-muted-foreground">+{number}</p>
        )}
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {status}
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- expanded */

/** Shown while the browser refuses to ring: it needs one click on the page first. */
function RingtoneBlockedHint() {
  const { t } = useTranslation();
  const blocked = useCallStore((s) => s.ringtoneBlocked);
  if (!blocked) return null;
  return (
    <Button variant="outline" size="sm" onClick={retryRingtone}>
      <IconVolume aria-hidden="true" />
      {t("Turn on ringtone")}
    </Button>
  );
}

function ExpandedRingingCall({ call }: Readonly<{ call: CallDto }>) {
  const { t } = useTranslation();
  const { pending, run } = useRingingActions(call.id);
  return (
    <>
      <CallIdentity
        name={displayName(call.contactName, call.customerWaId)}
        number={call.customerWaId}
        status={t("Incoming WhatsApp call")}
        ringing
      />
      <div className="flex items-start gap-12">
        <RoundAction
          label={t("Decline")}
          tone="end"
          loading={pending === "decline"}
          disabled={pending !== null}
          onClick={() => void run("decline")}
        >
          <IconPhoneOff aria-hidden="true" />
        </RoundAction>
        <RoundAction
          label={t("Answer")}
          tone="accept"
          loading={pending === "answer"}
          disabled={pending !== null}
          onClick={() => void run("answer")}
        >
          <IconPhone aria-hidden="true" />
        </RoundAction>
      </div>
      <RingtoneBlockedHint />
    </>
  );
}

function ExpandedActiveCall({ active }: Readonly<{ active: ActiveCall }>) {
  const { t } = useTranslation();
  const status = useStatusLine(active);
  const number = active.call?.customerWaId ?? null;
  return (
    <>
      <CallIdentity
        name={displayName(active.contactName, number)}
        number={number}
        status={status}
        ringing={active.phase === "ringing"}
      />
      <div className="flex items-start gap-12">
        <RoundAction
          label={active.muted ? t("Unmute") : t("Mute")}
          tone="neutral"
          pressed={active.muted}
          onClick={toggleMute}
        >
          {active.muted ? (
            <IconMicrophoneOff aria-hidden="true" />
          ) : (
            <IconMicrophone aria-hidden="true" />
          )}
        </RoundAction>
        <RoundAction label={t("Hang up")} tone="end" onClick={() => void hangUp()}>
          <IconPhoneOff aria-hidden="true" />
        </RoundAction>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- compact */

function ExpandButton() {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("Expand call")}
      onClick={() => setCallScreenMinimized(false)}
    >
      <IconArrowsDiagonal className="size-4" aria-hidden="true" />
    </Button>
  );
}

function CompactRingingCall({ call, busy }: Readonly<{ call: CallDto; busy: boolean }>) {
  const { t } = useTranslation();
  const { pending, run } = useRingingActions(call.id);
  const name = displayName(call.contactName, call.customerWaId);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <CreativeAvatar name={name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconPhoneIncoming className="size-3.5 animate-pulse text-primary" aria-hidden="true" />
            {t("Incoming WhatsApp call")}
          </p>
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          {call.contactName && (
            <p className="truncate text-xs text-muted-foreground">+{call.customerWaId}</p>
          )}
        </div>
        {!busy && <ExpandButton />}
      </div>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          className="flex-1"
          loading={pending === "decline"}
          disabled={pending !== null}
          onClick={() => void run("decline")}
        >
          <IconPhoneOff className="size-4" aria-hidden="true" />
          {t("Decline")}
        </Button>
        <Button
          className="flex-1"
          loading={pending === "answer"}
          // One call per tab: the microphone and the peer connection are single.
          disabled={pending !== null || busy}
          onClick={() => void run("answer")}
        >
          <IconPhone className="size-4" aria-hidden="true" />
          {t("Answer")}
        </Button>
      </div>
    </div>
  );
}

function CompactActiveCall({ active }: Readonly<{ active: ActiveCall }>) {
  const { t } = useTranslation();
  const status = useStatusLine(active);
  const name = displayName(active.contactName, active.call?.customerWaId ?? null);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
      <CreativeAvatar name={name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {status}
        </p>
      </div>
      <ExpandButton />
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={active.muted ? t("Unmute") : t("Mute")}
        aria-pressed={active.muted}
        onClick={toggleMute}
      >
        {active.muted ? (
          <IconMicrophoneOff className="size-4" aria-hidden="true" />
        ) : (
          <IconMicrophone className="size-4" aria-hidden="true" />
        )}
      </Button>
      <Button
        variant="destructive"
        size="icon-sm"
        aria-label={t("Hang up")}
        onClick={() => void hangUp()}
      >
        <IconPhoneOff className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
