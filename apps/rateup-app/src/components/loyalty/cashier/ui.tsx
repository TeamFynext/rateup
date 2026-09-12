import { ArrowLeft } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { getInboxRowTheme, type InboxRowTheme } from "@/constants/inboxDesign";

/**
 * The cashier's primitives.
 *
 * `components/common/` has a header, a search field, a skeleton, a progress bar and a
 * notice — no button, card, input, badge or tile. The web side is shadcn on Base UI
 * throughout, none of which crosses over, so the eight counter screens need a small set of
 * their own rather than 200 lines of inline `View` per screen.
 *
 * Colours come from `getInboxRowTheme` — the newest token module, and the one whose `brand`
 * is `#1C518E`, the real RateUp navy. The screen this replaces used `tailwind.config.js`'s
 * `primaryBlue: #1873E8` thirteen times, which is the off-brand blue the web has just
 * finished removing.
 *
 * Two local rules worth knowing before editing: in this Tailwind config `font-semibold`
 * sets `fontFamily`, not `fontWeight` (the faces are Nunito), so weight comes from naming
 * the face; and every colour here is an inline style rather than a class, matching
 * `ScreenHeader` and `SearchField`.
 */

export function useTheme(): { t: InboxRowTheme; isDark: boolean } {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return { t: getInboxRowTheme(isDark), isDark };
}

export const FONT = {
  regular: "Nunito_400Regular",
  medium: "Nunito_500Medium",
  semibold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extrabold: "Nunito_800ExtraBold",
} as const;

/* ── button ─────────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

/**
 * 48pt tall by default — the counter is used one-handed, often in a hurry, and the web's
 * `h-12` is the same decision.
 */
export function CashierButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  align = "center",
  compact,
}: Readonly<{
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  align?: "center" | "left";
  compact?: boolean;
}>) {
  const { t } = useTheme();
  const off = Boolean(disabled) || Boolean(loading);

  const palette = (() => {
    switch (variant) {
      case "primary":
        return { bg: t.brand, fg: "#FFFFFF", border: "transparent" };
      case "danger":
        return { bg: t.danger, fg: "#FFFFFF", border: "transparent" };
      case "outline":
        return { bg: "transparent", fg: t.fg1, border: t.border1 };
      case "ghost":
        return { bg: "transparent", fg: t.fg3, border: "transparent" };
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      style={({ pressed }) => ({
        minHeight: compact ? 38 : 48,
        paddingHorizontal: compact ? 12 : 16,
        borderRadius: 12,
        borderWidth: variant === "outline" ? 1 : 0,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: align === "left" ? "flex-start" : "center",
        gap: 8,
        opacity: off ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      {loading ? <ActivityIndicator size="small" color={palette.fg} /> : icon}
      <Text
        numberOfLines={1}
        style={{
          fontFamily: FONT.semibold,
          fontSize: compact ? 13 : 15,
          color: palette.fg,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ── surfaces ───────────────────────────────────────────────────────────────── */

export function Card({
  children,
  padding = 16,
  gap,
}: Readonly<{ children: React.ReactNode; padding?: number; gap?: number }>) {
  const { t } = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border1,
        padding,
        gap,
      }}
    >
      {children}
    </View>
  );
}

/** A row list inside a card — the divider is the design's `rowDivider`, not `border1`. */
export function Divider() {
  const { t } = useTheme();
  return <View style={{ height: 1, backgroundColor: t.rowDivider }} />;
}

/**
 * The warm callout. Used for the one thing staff forget: a reward already paid for and
 * still waiting to be handed over.
 */
export function WarmAlert({
  title,
  children,
}: Readonly<{ title: string; children?: React.ReactNode }>) {
  const { t } = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.warmSoft,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.note.border,
        padding: 14,
        gap: 10,
      }}
    >
      <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: t.warmStrong }}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * A failure reported where it happened.
 *
 * `Notice.tsx` documents, as an accepted limit, that a notice raised while a native
 * `Modal` is open renders *behind* it — which is exactly where every counter action used to
 * report from. So nothing here toasts: an error belongs on the form that caused it.
 */
export function InlineError({ message }: Readonly<{ message: string | null }>) {
  const { t } = useTheme();
  if (!message) return null;
  return (
    <View
      style={{
        backgroundColor: t.status.spam.soft,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ fontFamily: FONT.medium, fontSize: 13, color: t.status.spam.fg }}>
        {message}
      </Text>
    </View>
  );
}

export function Badge({
  label,
  tone = "neutral",
  dotColor,
}: Readonly<{ label: string; tone?: "neutral" | "warm" | "good"; dotColor?: string | null }>) {
  const { t } = useTheme();
  const palette =
    tone === "warm"
      ? { bg: t.status.pending.soft, fg: t.status.pending.fg }
      : tone === "good"
        ? { bg: t.status.open.soft, fg: t.status.open.fg }
        : { bg: t.surface2, fg: t.fg3 };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-start",
        backgroundColor: palette.bg,
        borderRadius: 999,
        paddingVertical: 3,
        paddingHorizontal: 9,
      }}
    >
      {dotColor ? (
        <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: dotColor }} />
      ) : null}
      <Text style={{ fontFamily: FONT.semibold, fontSize: 11, color: palette.fg }}>{label}</Text>
    </View>
  );
}

/** Initials on a tinted disc — the app has no avatar component. */
export function Avatar({ name, size = 44 }: Readonly<{ name: string; size?: number }>) {
  const { t } = useTheme();
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: t.brandSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: FONT.bold, fontSize: size * 0.36, color: t.brand }}>
        {initials}
      </Text>
    </View>
  );
}

/* ── tiles and rows ─────────────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  unit,
  highlight,
}: Readonly<{ label: string; value: string; unit?: string; highlight?: boolean }>) {
  const { t } = useTheme();
  return (
    <View
      style={{
        flexBasis: "47%",
        flexGrow: 1,
        borderWidth: 1,
        borderColor: t.border1,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Text style={{ fontFamily: FONT.regular, fontSize: 11, color: t.fg3 }}>{label}</Text>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: FONT.bold,
          fontSize: 19,
          color: highlight ? t.brand : t.fg1,
          marginTop: 2,
        }}
      >
        {value}
      </Text>
      {unit ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 11, color: t.fg3 }}>{unit}</Text>
      ) : null}
    </View>
  );
}

/** One line of a receipt. `strong` is the new balance; `tone` colours the change. */
export function ReceiptRow({
  label,
  value,
  strong,
  tone,
}: Readonly<{ label: string; value: string; strong?: boolean; tone?: "good" | "neutral" }>) {
  const { t } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 11,
        paddingHorizontal: 14,
      }}
    >
      <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3, flexShrink: 1 }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: strong ? FONT.bold : tone === "good" ? FONT.semibold : FONT.regular,
          fontSize: strong ? 16 : 13,
          color: tone === "good" ? t.success : t.fg1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/* ── forms ──────────────────────────────────────────────────────────────────── */

/**
 * The back affordance and the title, on every step below the customer.
 *
 * `subtitle` carries the customer's name, so staff can see who an action is about without
 * leaving it — on the web that came from the rail, which a phone has no room for.
 */
export function FormHeader({
  title,
  subtitle,
  onBack,
}: Readonly<{ title: string; subtitle?: string; onBack: () => void }>) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={({ pressed }) => ({
          width: 38,
          height: 38,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? t.surface2 : "transparent",
        })}
      >
        <ArrowLeft size={20} color={t.fg2} />
      </Pressable>
      <View style={{ flex: 1 }}>
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontFamily: FONT.regular, fontSize: 11, color: t.fg3 }}>
            {subtitle}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={{ fontFamily: FONT.bold, fontSize: 17, color: t.fg1 }}>
          {title}
        </Text>
      </View>
    </View>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: Readonly<{
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}>) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: t.fg2 }}>{label}</Text>
      {children}
      {error ? (
        <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: t.danger }}>{error}</Text>
      ) : hint ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

interface CashierInputProps extends Omit<TextInputProps, "style"> {
  /** A leading symbol — the currency, on the amount field. */
  prefix?: string;
  /** Bigger type for the one number staff read aloud. */
  emphasis?: boolean;
  invalid?: boolean;
}

export function CashierInput({ prefix, emphasis, invalid, ...props }: Readonly<CashierInputProps>) {
  const { t } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: emphasis ? 58 : 48,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: invalid ? t.danger : t.border1,
        backgroundColor: t.surface,
      }}
    >
      {prefix ? (
        <Text style={{ fontFamily: FONT.semibold, fontSize: emphasis ? 22 : 15, color: t.fg3 }}>
          {prefix}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={t.fg4}
        {...props}
        style={{
          flex: 1,
          fontFamily: emphasis ? FONT.bold : FONT.regular,
          fontSize: emphasis ? 26 : 15,
          color: t.fg1,
          padding: 0,
        }}
      />
    </View>
  );
}

/* ── states ─────────────────────────────────────────────────────────────────── */

export function EmptyState({
  title,
  body,
  children,
}: Readonly<{ title: string; body?: string; children?: React.ReactNode }>) {
  const { t } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: t.border1,
        borderStyle: "dashed",
        borderRadius: 14,
        padding: 20,
        gap: 8,
      }}
    >
      <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: t.fg1 }}>{title}</Text>
      {body ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3, lineHeight: 19 }}>
          {body}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function CenteredSpinner() {
  const { t } = useTheme();
  return (
    <View style={{ paddingVertical: 40, alignItems: "center" }}>
      <ActivityIndicator color={t.brand} />
    </View>
  );
}
