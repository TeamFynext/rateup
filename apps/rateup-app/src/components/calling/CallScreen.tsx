import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Modal, Pressable, StatusBar, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Volume1,
  Volume2,
} from "lucide-react-native";

import { callErrorMessage, getRingingCalls, type CallDto } from "@/api/whatsapp/calling";
import { Toast } from "@/components/common/Notice";
import { Colors } from "@/constants/colors";
import { inboxAvatarColors, paletteIndex } from "@/constants/inboxDesign";
import {
  type ActiveCall,
  answer,
  clearLastEnded,
  decline,
  hangUp,
  setCallScreenMinimized,
  syncRingingCalls,
  toggleMute,
  toggleSpeaker,
  useCallStore,
} from "@/store/callStore";
import { namePreview } from "@/utils/chatbox_utils";
import { callingSupported } from "@/utils/callMedia";
import { useNativeCalls } from "@/utils/nativeCalls";

const ACCEPT = Colors.accent.whatsapp;
const END = "#E5484D";

/** `1:05`, `12:30`, `1:02:03` — a running call clock. */
function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function displayName(name: string | null, number: string | null): string {
  return name ?? (number ? `+${number}` : "");
}

/** Ask the server what is ringing. The socket is the fast path; this is the safety net. */
function resync() {
  getRingingCalls()
    .then(syncRingingCalls)
    .catch(() => undefined);
}

/**
 * The app-wide call surface. A ringing or live call takes the whole screen; it can be
 * shrunk to a bar at the top so the agent can read the chat while talking. Mounted once
 * in the protected layout, so it survives navigation — leaving a screen must not drop a
 * call.
 */
/** Nothing on a build without the calling native modules — it could not answer anyway. */
export default function CallScreen() {
  // The phone's own call surfaces (Android's call notification, iOS CallKit).
  useNativeCalls();
  if (!callingSupported) return null;
  return <CallSurface />;
}

function CallSurface() {
  const ringing = useCallStore((s) => s.ringing);
  const active = useCallStore((s) => s.active);
  const minimized = useCallStore((s) => s.minimized);
  const lastEnded = useCallStore((s) => s.lastEnded);

  // A call that rang while the app was in the background (or closed) is only known to the
  // server and the push; pick it up on launch and on every return to the foreground.
  useEffect(() => {
    resync();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") resync();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!lastEnded) return;
    if (lastEnded.status === "REJECTED" && lastEnded.direction === "BUSINESS_INITIATED") {
      Toast.info("The customer declined the call");
    } else if (lastEnded.durationSeconds) {
      Toast.info(`Call ended · ${formatDuration(lastEnded.durationSeconds)}`);
    }
    clearLastEnded();
  }, [lastEnded]);

  const focus = active ? null : (ringing[0] ?? null);
  const hasCall = Boolean(active || focus);
  if (!hasCall) return null;

  if (minimized) {
    return active ? <MinimizedActive active={active} /> : <MinimizedRinging call={focus!} />;
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      // The hardware back button tucks the call away; it never ends it.
      onRequestClose={() => setCallScreenMinimized(true)}
    >
      {active ? <ActiveCallView active={active} /> : <RingingView call={focus!} />}
    </Modal>
  );
}

/* --------------------------------------------------------------- shared */

function useElapsedSeconds(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [since]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
}

function useStatusLine(active: ActiveCall): string {
  const elapsed = useElapsedSeconds(active.connectedAt);
  switch (active.phase) {
    case "preparing":
      return active.direction === "BUSINESS_INITIATED" ? "Starting call…" : "Connecting…";
    case "ringing":
      return "Ringing…";
    case "connecting":
      return "Connecting…";
    case "connected":
      return formatDuration(elapsed);
  }
}

function useRingingAction(callId: string) {
  const [pending, setPending] = useState<"answer" | "decline" | null>(null);
  const run = async (action: "answer" | "decline") => {
    setPending(action);
    try {
      await (action === "answer" ? answer(callId) : decline(callId));
    } catch (error) {
      Toast.error(
        callErrorMessage(
          error,
          action === "answer" ? "Could not answer the call" : "Could not decline the call",
        ),
      );
    } finally {
      setPending(null);
    }
  };
  return { pending, run };
}

/** Full-screen chrome: the minimise control, the caller, and the controls at the bottom. */
function CallLayout({
  title,
  name,
  number,
  seed,
  status,
  pulsing,
  children,
}: Readonly<{
  title: string;
  name: string;
  number: string | null;
  seed: string;
  status: string;
  pulsing?: boolean;
  children: ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const background = isDark ? Colors.brand.navy : Colors.brand.navyDeep;
  const avatar = inboxAvatarColors[paletteIndex(seed, inboxAvatarColors.length)];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: background,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
      }}
    >
      <StatusBar barStyle="light-content" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            color: "rgba(255,255,255,0.7)",
            fontFamily: "Figtree_600SemiBold",
            fontSize: 13,
          }}
        >
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Minimise call"
          onPress={() => setCallScreenMinimized(true)}
          hitSlop={12}
          style={{ padding: 8 }}
        >
          <Minimize2 size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
        <View
          style={{
            width: 132,
            height: 132,
            borderRadius: 66,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pulsing ? "rgba(255,255,255,0.08)" : "transparent",
          }}
        >
          <View
            style={{
              width: 108,
              height: 108,
              borderRadius: 54,
              backgroundColor: avatar,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: "Figtree_800ExtraBold", fontSize: 38, color: "#fff" }}>
              {namePreview(name)}
            </Text>
          </View>
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: "Figtree_800ExtraBold",
            fontSize: 26,
            color: "#fff",
            maxWidth: "90%",
          }}
        >
          {name}
        </Text>
        {number && name !== `+${number}` ? (
          <Text
            style={{
              fontFamily: "InstrumentSans_400Regular",
              fontSize: 15,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            +{number}
          </Text>
        ) : null}
        <Text
          accessibilityLiveRegion="polite"
          style={{
            fontFamily: "InstrumentSans_700Bold",
            fontSize: 16,
            color: "rgba(255,255,255,0.85)",
            fontVariant: ["tabular-nums"],
          }}
        >
          {status}
        </Text>
      </View>

      <View
        style={{ flexDirection: "row", justifyContent: "space-evenly", alignItems: "flex-start" }}
      >
        {children}
      </View>
    </View>
  );
}

function RoundButton({
  label,
  color,
  onPress,
  loading,
  disabled,
  pressed,
  children,
}: Readonly<{
  label: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}>) {
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, selected: pressed }}
        onPress={onPress}
        disabled={disabled || loading}
        // A plain object, not `({ pressed }) => …`: NativeWind's Pressable wrapper drops
        // function styles, which left these buttons with no fill at all.
        android_ripple={{ color: "rgba(255,255,255,0.25)", borderless: true, radius: 36 }}
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : children}
      </Pressable>
      <Text
        style={{
          fontFamily: "InstrumentSans_400Regular",
          fontSize: 13,
          color: "rgba(255,255,255,0.8)",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/* ----------------------------------------------------------- full screen */

function RingingView({ call }: Readonly<{ call: CallDto }>) {
  const { pending, run } = useRingingAction(call.id);
  return (
    <CallLayout
      title="Incoming WhatsApp call"
      name={displayName(call.contactName, call.customerWaId)}
      number={call.customerWaId}
      seed={call.contactId ?? call.customerWaId}
      status="Ringing…"
      pulsing
    >
      <RoundButton
        label="Decline"
        color={END}
        loading={pending === "decline"}
        disabled={pending !== null}
        onPress={() => void run("decline")}
      >
        <PhoneOff size={30} color="#fff" />
      </RoundButton>
      <RoundButton
        label="Answer"
        color={ACCEPT}
        loading={pending === "answer"}
        disabled={pending !== null}
        onPress={() => void run("answer")}
      >
        <Phone size={30} color="#fff" />
      </RoundButton>
    </CallLayout>
  );
}

function ActiveCallView({ active }: Readonly<{ active: ActiveCall }>) {
  const status = useStatusLine(active);
  const neutral = "rgba(255,255,255,0.14)";
  // "On" is a solid fill behind the same white glyph. A dark glyph on a light fill rendered
  // as an empty white circle on device, so the icon stays white in both states.
  const on = Colors.brand.blueLight;
  return (
    <CallLayout
      title="WhatsApp voice call"
      name={displayName(active.contactName, active.customerWaId)}
      number={active.customerWaId}
      seed={active.contactId ?? active.customerWaId ?? ""}
      status={status}
      pulsing={active.phase === "ringing"}
    >
      <RoundButton
        label={active.muted ? "Unmute" : "Mute"}
        color={active.muted ? on : neutral}
        pressed={active.muted}
        onPress={toggleMute}
      >
        {active.muted ? <MicOff size={28} color="#fff" /> : <Mic size={28} color="#fff" />}
      </RoundButton>
      <RoundButton
        label={active.speaker ? "Speaker on" : "Speaker"}
        color={active.speaker ? on : neutral}
        pressed={active.speaker}
        onPress={toggleSpeaker}
      >
        {active.speaker ? <Volume2 size={28} color="#fff" /> : <Volume1 size={28} color="#fff" />}
      </RoundButton>
      <RoundButton label="Hang up" color={END} onPress={() => void hangUp()}>
        <PhoneOff size={30} color="#fff" />
      </RoundButton>
    </CallLayout>
  );
}

/* ------------------------------------------------------------- minimised */

function MinimizedBar({
  icon,
  title,
  subtitle,
  children,
}: Readonly<{ icon: ReactNode; title: string; subtitle: string; children: ReactNode }>) {
  return (
    // In the layout's flow, above the screens, rather than floating over them: it sits
    // below the status bar (the layout's safe area pads it) and pushes the screen down
    // instead of covering its header — WhatsApp's "return to call" bar does the same.
    <View
      style={{
        backgroundColor: Colors.brand.navyDeep,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        paddingLeft: 14,
        paddingRight: 10,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Expand call"
        onPress={() => setCallScreenMinimized(false)}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 }}
      >
        {icon}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: "Figtree_700Bold", fontSize: 14, color: "#fff" }}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: "InstrumentSans_400Regular",
              fontSize: 12,
              color: "rgba(255,255,255,0.75)",
              fontVariant: ["tabular-nums"],
            }}
          >
            {subtitle}
          </Text>
        </View>
        <Maximize2 size={16} color="rgba(255,255,255,0.7)" />
      </Pressable>
      {children}
    </View>
  );
}

function SmallRound({
  label,
  color,
  onPress,
  disabled,
  children,
}: Readonly<{
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </Pressable>
  );
}

function MinimizedRinging({ call }: Readonly<{ call: CallDto }>) {
  const { pending, run } = useRingingAction(call.id);
  return (
    <MinimizedBar
      icon={<PhoneIncoming size={18} color={ACCEPT} />}
      title={displayName(call.contactName, call.customerWaId)}
      subtitle="Incoming WhatsApp call"
    >
      <SmallRound
        label="Decline"
        color={END}
        disabled={pending !== null}
        onPress={() => void run("decline")}
      >
        <PhoneOff size={18} color="#fff" />
      </SmallRound>
      <SmallRound
        label="Answer"
        color={ACCEPT}
        disabled={pending !== null}
        onPress={() => void run("answer")}
      >
        <Phone size={18} color="#fff" />
      </SmallRound>
    </MinimizedBar>
  );
}

function MinimizedActive({ active }: Readonly<{ active: ActiveCall }>) {
  const status = useStatusLine(active);
  return (
    <MinimizedBar
      icon={<Phone size={18} color={ACCEPT} />}
      title={displayName(active.contactName, active.customerWaId)}
      subtitle={status}
    >
      <SmallRound
        label={active.muted ? "Unmute" : "Mute"}
        color="rgba(255,255,255,0.16)"
        onPress={toggleMute}
      >
        {active.muted ? <MicOff size={18} color="#fff" /> : <Mic size={18} color="#fff" />}
      </SmallRound>
      <SmallRound label="Hang up" color={END} onPress={() => void hangUp()}>
        <PhoneOff size={18} color="#fff" />
      </SmallRound>
    </MinimizedBar>
  );
}
