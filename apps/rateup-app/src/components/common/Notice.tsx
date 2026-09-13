import React, { useEffect } from "react";
import { Text, View, Pressable } from "react-native";
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react-native";
import { create } from "zustand";
import { Colors } from "@/constants/colors";

/**
 * In-app notices, replacing toastify-react-native.
 *
 * That library renders every toast inside a native `Modal` (its `useModal`
 * option defaults to true). On Android a Modal is a separate window that
 * captures all touch input for the whole screen, while an already-focused
 * TextInput keeps its keyboard connection. The result was a chat you could
 * type into but not tap any button in, for the life of the toast — worst on
 * the notification deep-link path, which cold-starts several requests at once
 * and so raises error toasts most often.
 *
 * This host renders in the normal view tree with `pointerEvents="box-none"`,
 * so touches pass through everywhere except the notice card itself.
 *
 * Known limit, accepted deliberately: a notice raised while a native `Modal`
 * is open renders behind it. Showing above one would mean putting the notice
 * in a Modal of its own, which is the bug this replaces. Screens that need to
 * report a failure from inside their own modal should show it inline.
 */

export type NoticeType = "success" | "error" | "warn" | "info" | "default";

export type NoticeOptions = {
  type?: NoticeType;
  /** Primary line. Named `text1` to match the call sites this replaced. */
  text1: string;
  /** Optional supporting line. */
  text2?: string;
  /** Milliseconds on screen. Defaults to 4000 for errors, 3000 otherwise. */
  visibilityTime?: number;
};

type NoticeItem = NoticeOptions & { id: number; visibilityTime: number };

type NoticeState = {
  notices: NoticeItem[];
  push: (options: NoticeOptions) => void;
  dismiss: (id: number) => void;
  clear: () => void;
};

/** At most this many on screen; the oldest is dropped past it. */
const MAX_VISIBLE = 3;

let nextId = 0;

const useNoticeStore = create<NoticeState>((set) => ({
  notices: [],
  push: (options) => {
    const item: NoticeItem = {
      ...options,
      id: nextId++,
      type: options.type ?? "default",
      visibilityTime: options.visibilityTime ?? (options.type === "error" ? 4000 : 3000),
    };
    set((state) => ({ notices: [...state.notices, item].slice(-MAX_VISIBLE) }));
  },
  dismiss: (id) => set((state) => ({ notices: state.notices.filter((n) => n.id !== id) })),
  clear: () => set({ notices: [] }),
}));

/**
 * Imperative API, callable from anywhere including non-React modules.
 *
 * Keeps the `show({ type, text1, text2 })` shape of the library it replaces so
 * the call sites did not have to change.
 */
export const Toast = {
  show: (options: NoticeOptions) => useNoticeStore.getState().push(options),
  success: (text1: string) => useNoticeStore.getState().push({ type: "success", text1 }),
  error: (text1: string) => useNoticeStore.getState().push({ type: "error", text1 }),
  warn: (text1: string) => useNoticeStore.getState().push({ type: "warn", text1 }),
  info: (text1: string) => useNoticeStore.getState().push({ type: "info", text1 }),
  hide: () => useNoticeStore.getState().clear(),
};

function useNoticeStyle(type: NoticeType, isDark: boolean) {
  const base = {
    background: isDark ? Colors.dark.surface : Colors.light.card,
    border: isDark ? Colors.dark.borderLight : Colors.light.border,
    title: isDark ? Colors.dark.textPrimary : Colors.light.textPrimary,
    body: isDark ? Colors.dark.textSubtle : Colors.light.textSubtle,
    close: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
  };

  switch (type) {
    case "success":
      return { ...base, accent: "#22C55E", icon: <CheckCircle size={18} color="#22C55E" /> };
    case "error":
      return { ...base, accent: "#EF4444", icon: <XCircle size={18} color="#EF4444" /> };
    case "warn":
      return {
        ...base,
        accent: Colors.accent.orange,
        icon: <AlertTriangle size={18} color={Colors.accent.orange} />,
      };
    default:
      return {
        ...base,
        accent: Colors.brand.blue,
        icon: <Info size={18} color={Colors.brand.blue} />,
      };
  }
}

const NoticeCard = ({ item }: { item: NoticeItem }) => {
  const { colorScheme } = useColorScheme();
  const dismiss = useNoticeStore((s) => s.dismiss);
  const style = useNoticeStyle(item.type ?? "default", colorScheme === "dark");

  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), item.visibilityTime);
    return () => clearTimeout(timer);
  }, [item.id, item.visibilityTime, dismiss]);

  return (
    <Animated.View
      entering={FadeInUp.duration(180)}
      exiting={FadeOutUp.duration(150)}
      layout={LinearTransition.duration(180)}
      // The card is the only part that takes touches. Its parent is box-none
      // so the rest of the screen stays interactive while this is up.
      pointerEvents="auto"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginHorizontal: 12,
        marginTop: 8,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: style.accent,
        borderWidth: 1,
        borderColor: style.border,
        backgroundColor: style.background,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <View style={{ paddingTop: 1 }}>{style.icon}</View>

      <View style={{ flex: 1 }}>
        <Text
          style={{ fontFamily: "InstrumentSans_600SemiBold", fontSize: 13, color: style.title }}
          numberOfLines={2}
        >
          {item.text1}
        </Text>
        {item.text2 ? (
          <Text
            style={{
              fontFamily: "InstrumentSans_400Regular",
              fontSize: 12,
              color: style.body,
              marginTop: 2,
            }}
            numberOfLines={3}
          >
            {item.text2}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => dismiss(item.id)}
        hitSlop={10}
        accessibilityLabel="Dismiss notification"
      >
        <X size={16} color={style.close} />
      </Pressable>
    </Animated.View>
  );
};

/**
 * Mount once, near the root and above the navigator.
 */
export const NoticeHost = () => {
  const notices = useNoticeStore((s) => s.notices);
  const insets = useSafeAreaInsets();

  if (!notices.length) return null;

  return (
    <View
      // The whole point: this layer never swallows a touch. Only the cards do.
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
    >
      {notices.map((item) => (
        <NoticeCard key={item.id} item={item} />
      ))}
    </View>
  );
};

export default NoticeHost;
