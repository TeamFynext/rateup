import { useColorScheme } from "nativewind";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
 * sets `fontFamily`, not `fontWeight` (the faces are static), so weight comes from naming
 * the face; and every colour here is an inline style rather than a class, matching
 * `ScreenHeader` and `SearchField`.
 */

export function useTheme(): { t: InboxRowTheme; isDark: boolean } {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return { t: getInboxRowTheme(isDark), isDark };
}

/**
 * The web's Design System V2 split, mirrored: Instrument Sans for body and UI, Figtree
 * for display. Instrument Sans stops at 700, so the counter's two extremes come from
 * Figtree — 900 for the one figure read across a counter, 300 for the labels that must
 * not compete with it.
 */
export const FONT = {
  light: "Figtree_300Light",
  regular: "InstrumentSans_400Regular",
  medium: "InstrumentSans_500Medium",
  semibold: "InstrumentSans_600SemiBold",
  bold: "InstrumentSans_700Bold",
  extrabold: "Figtree_800ExtraBold",
  black: "Figtree_900Black",
} as const;

/**
 * Tabular figures, for every balance, delta and amount.
 *
 * Proportional digits re-flow as a number changes — a balance ticking 1,283 → 1,326
 * shifts under the eye mid-sentence, and a column of them never aligns digit to digit.
 * At a counter these numbers are compared and read out loud, so they are set on a fixed
 * advance everywhere. Spread it into the style, never onto a container.
 */
export const NUM: TextStyle = { fontVariant: ["tabular-nums"] };

/** The label voice: small, light, wide, quiet. Pairs with `NUM` figures above it. */
export const LABEL: TextStyle = {
  fontFamily: FONT.light,
  fontSize: 11,
  letterSpacing: 0.7,
  textTransform: "uppercase",
};

/* ── pressables ─────────────────────────────────────────────────────────────── */

/**
 * Pressed state without a `style` function.
 *
 * `babel.config.js` sets `jsxImportSource: "nativewind"`, so every element in this app is
 * created by NativeWind's jsx runtime and its style interop. A `style` handed to
 * `Pressable` as `({ pressed }) => ({…})` does not survive that: React Native receives no
 * style at all, and the control loses its fill, its border and even its `flexDirection` —
 * collapsing to an unstyled column. On a filled button that is white label text on a white
 * ground, which reads on screen as a button that simply is not there.
 *
 * The state form below is equivalent, immune to the interop, and the only way a pressable
 * in this folder should be styled.
 */
function usePressed() {
  const [pressed, setPressed] = React.useState(false);
  return {
    pressed,
    pressHandlers: {
      onPressIn: () => setPressed(true),
      onPressOut: () => setPressed(false),
    },
  };
}

/** A tappable row inside a `Card` — the list idiom, with its own pressed state. */
export function PressableRow({
  onPress,
  accessibilityLabel,
  children,
}: Readonly<{
  onPress: () => void;
  accessibilityLabel?: string;
  children: React.ReactNode;
}>) {
  const { t } = useTheme();
  const { pressed, pressHandlers } = usePressed();
  return (
    <Pressable
      onPress={onPress}
      {...pressHandlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 14,
        backgroundColor: pressed ? t.surface2 : "transparent",
      }}
    >
      {children}
    </Pressable>
  );
}

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
  const { pressed, pressHandlers } = usePressed();
  const off = Boolean(disabled) || Boolean(loading);

  const palette = (() => {
    switch (variant) {
      case "primary":
        // `brandInk`, not `brand`: in dark `brand` is a bright cyan meant to be read *as
        // text* on #121212, and the white label every call site pairs with it sits at
        // ~2:1 on that fill. The fixed navy is white-on-brand in both themes, and matches
        // the balance panel it sits under.
        return { bg: t.brandInk, fg: "#FFFFFF", border: "transparent" };
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
      {...pressHandlers}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      style={{
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
      }}
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

/* ── tiles and rows ─────────────────────────────────────────────────────────── */

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
          ...NUM,
          fontFamily: strong ? FONT.black : tone === "good" ? FONT.semibold : FONT.regular,
          fontSize: strong ? 22 : 13,
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
 * The step's own title, above its fields.
 *
 * The back arrow that used to live here moved into `ScreenHeader`: inside the scroll it
 * was gone by the bottom of a long form, and `CustomerView` — which has no form header at
 * all — had no way back on iOS, where there is no hardware button to fall back on.
 *
 * `subtitle` carries the customer's name, so staff can see who an action is about without
 * leaving it — on the web that came from the rail, which a phone has no room for.
 */
export function FormHeader({ title, subtitle }: Readonly<{ title: string; subtitle?: string }>) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      {subtitle ? (
        <Text numberOfLines={1} style={{ ...LABEL, color: t.fg4 }}>
          {subtitle}
        </Text>
      ) : null}
      <Text numberOfLines={1} style={{ fontFamily: FONT.bold, fontSize: 20, color: t.fg1 }}>
        {title}
      </Text>
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
          ...(emphasis ? NUM : null),
          fontFamily: emphasis ? FONT.black : FONT.regular,
          fontSize: emphasis ? 30 : 15,
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

/* ── layout ─────────────────────────────────────────────────────────────────── */

/**
 * A step's scroll, with its commitment pinned to the bottom.
 *
 * Every step used to render into one `ScrollView` owned by `CashierScreen`, which put each
 * screen's primary action wherever its content happened to end — below the amount field,
 * the estimate and the note on `AddPurchaseForm`, so on a 6.1" phone with the keyboard up
 * it was off-screen. The counter is worked one-handed with a card machine in the other, so
 * what you commit with lives in the thumb's reach and does not move between steps.
 *
 * The scroll is per-step rather than shared so the footer can hold that step's own state
 * (the estimate, the selected reward) without lifting it into the container.
 */
export function StepScroll({
  children,
  footer,
}: Readonly<{ children: React.ReactNode; footer?: React.ReactNode }>) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: footer ? 20 : 32 + insets.bottom,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>

      {footer ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12 + insets.bottom,
            gap: 10,
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderTopColor: t.border1,
          }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** Equal-width buttons on one line, for a footer's secondary actions. */
export function ActionRow({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {React.Children.map(children, (child) =>
        child ? <View style={{ flex: 1 }}>{child}</View> : null,
      )}
    </View>
  );
}

/* ── the balance ────────────────────────────────────────────────────────────── */

/* White on `brandInk` is ~7.5:1 in both themes; these are the panel's own foregrounds,
   the same way `CashierButton` carries its own "#FFFFFF" on a filled variant. */
const ON_INK = "#FFFFFF";
const ON_INK_SOFT = "rgba(255,255,255,0.74)";
const ON_INK_FAINT = "rgba(255,255,255,0.16)";

/**
 * Who is at the counter and what they have, as one filled panel.
 *
 * This replaces a four-tile grid — available, lifetime, rewards in reach, spend to next
 * tier — set at one size, in which the only number anyone says out loud was marked by
 * being navy rather than black. Lifetime points and total spend are a dashboard's
 * metrics; at a till they are noise around the one figure that decides what happens next,
 * so they move down into the visit history and the balance gets the panel to itself.
 *
 * Filled rather than bordered because both people in the transaction look at it: the
 * customer reads their own balance off it from the other side of the counter.
 */
export function BalanceSlab({
  name,
  tierName,
  tierColor,
  value,
  unit,
  pending,
  footnote,
}: Readonly<{
  name: string;
  tierName?: string | null;
  tierColor?: string | null;
  value: string;
  unit: string;
  /** Points taken at the counter the server has not been told about yet. */
  pending?: string | null;
  /** What this balance can do right now — rewards in reach, or how far off the next is. */
  footnote?: string | null;
}>) {
  const { t } = useTheme();
  return (
    <View style={{ backgroundColor: t.brandInk, borderRadius: 18, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: FONT.semibold, fontSize: 15, color: ON_INK, flex: 1 }}
        >
          {name}
        </Text>
        {tierName ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: ON_INK_FAINT,
              borderRadius: 999,
              paddingVertical: 3,
              paddingHorizontal: 9,
            }}
          >
            {tierColor ? (
              <View
                style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: tierColor }}
              />
            ) : null}
            <Text style={{ fontFamily: FONT.semibold, fontSize: 11, color: ON_INK }}>
              {tierName}
            </Text>
          </View>
        ) : null}
      </View>

      <View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={{
            ...NUM,
            fontFamily: FONT.black,
            fontSize: 44,
            lineHeight: 50,
            letterSpacing: -1,
            color: ON_INK,
          }}
        >
          {value}
        </Text>
        <Text style={{ fontFamily: FONT.medium, fontSize: 13, color: ON_INK_SOFT }}>
          {unit}
          {pending ? (
            <Text style={{ ...NUM, fontFamily: FONT.semibold, color: t.status.pending.fg }}>
              {"  ·  "}
              {pending}
            </Text>
          ) : null}
        </Text>
      </View>

      {footnote ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: ON_INK_SOFT }}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

/* ── the receipt slip ───────────────────────────────────────────────────────── */

/**
 * A tear line across the slip: a dashed rule, notched into both edges.
 *
 * The one piece of decoration in the whole counter, on the one screen that is a record
 * rather than a control — and the screen the customer is actually watching.
 */
export function Perforation() {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: 16 }}>
      <View
        style={{
          width: 8,
          height: 16,
          marginLeft: -1,
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
          backgroundColor: t.pageBg,
          borderWidth: 1,
          borderLeftWidth: 0,
          borderColor: t.border1,
        }}
      />
      <View
        style={{
          flex: 1,
          marginHorizontal: 6,
          borderBottomWidth: 1,
          borderStyle: "dashed",
          borderColor: t.border1,
        }}
      />
      <View
        style={{
          width: 8,
          height: 16,
          marginRight: -1,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          backgroundColor: t.pageBg,
          borderWidth: 1,
          borderRightWidth: 0,
          borderColor: t.border1,
        }}
      />
    </View>
  );
}

/** The slip itself — a card that reads as something torn off and handed over. */
export function Slip({ children }: Readonly<{ children: React.ReactNode }>) {
  const { t } = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border1,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}
