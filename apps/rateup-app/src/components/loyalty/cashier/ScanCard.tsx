import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Flashlight, FlashlightOff, Keyboard as KeyboardIcon, Search } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";

import { hapticWarning } from "./haptics";
import { parseCardCode } from "./logic/cardCode";
import {
  Card,
  CashierButton,
  CashierInput,
  CenteredSpinner,
  EmptyState,
  Field,
  FONT,
  FormHeader,
  InlineError,
  StepScroll,
  useTheme,
} from "./ui";

interface ScanCardProps {
  /** Whether the camera may run. Off while the tab is unfocused or a code is being looked up. */
  active: boolean;
  resolving: boolean;
  /** The last lookup's failure, shown under the viewfinder; scanning continues regardless. */
  error: string | null;
  onCode: (code: string) => void;
  onBack: () => void;
}

/** A QR is in view on every frame; one card must not fire a lookup per frame. */
const REPEAT_WINDOW_MS = 2000;

/**
 * The scanner: the customer holds up the card from their WhatsApp chat, the cashier points
 * the phone at it, and the customer opens.
 *
 * A square viewfinder inside the screen's normal scroll, not a full-bleed camera — every
 * step here renders under `ScreenHeader` with the outbox badge beside it, and taking the
 * whole screen would hide both. The code field below it is the fallback for a cracked
 * screen, a dim display, and the simulator, whose camera is black.
 */
export function ScanCard({ active, resolving, error, onCode, onBack }: Readonly<ScanCardProps>) {
  const { t } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const last = useRef<{ value: string; at: number }>({ value: "", at: 0 });

  const onScanned = ({ data }: BarcodeScanningResult) => {
    const now = Date.now();
    if (data === last.current.value && now - last.current.at < REPEAT_WINDOW_MS) return;
    last.current = { value: data, at: now };
    const code = parseCardCode(data);
    if (!code) {
      hapticWarning();
      setHint("That QR is not a RateUp card.");
      return;
    }
    setHint(null);
    onCode(code);
  };

  const submitTyped = () => {
    const code = parseCardCode(typed);
    if (!code) {
      hapticWarning();
      setHint("A card code is 12 letters and digits, like ABCD-EFGH-JKLM.");
      return;
    }
    setHint(null);
    onCode(code);
  };

  const viewfinder = (() => {
    if (!permission) return <CenteredSpinner />;
    if (!permission.granted) {
      return (
        <EmptyState
          title="Camera access needed"
          body={
            permission.canAskAgain
              ? "The camera reads the customer's card. Nothing is recorded."
              : "Camera access is off for RateUp. Turn it on in Settings to scan cards."
          }
        >
          <CashierButton
            label={permission.canAskAgain ? "Allow camera" : "Open Settings"}
            onPress={() => {
              if (permission.canAskAgain) void requestPermission();
              else void Linking.openSettings();
            }}
            compact
          />
        </EmptyState>
      );
    }
    return (
      <View
        style={{
          width: "100%",
          aspectRatio: 1,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#000000",
        }}
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          active={active && !resolving}
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={resolving ? undefined : onScanned}
        />
        {/* The frame staff line the code up with. Pointer events pass through to nothing. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "18%",
            left: "18%",
            right: "18%",
            bottom: "18%",
            borderRadius: 18,
            borderWidth: 2,
            borderColor: resolving ? t.brand : "rgba(255,255,255,0.85)",
          }}
        />
        {resolving ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 14,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: "#FFFFFF" }}>
              Finding the customer…
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={() => setTorch((on) => !on)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={torch ? "Turn torch off" : "Turn torch on"}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        >
          {torch ? (
            <FlashlightOff size={18} color="#FFFFFF" />
          ) : (
            <Flashlight size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    );
  })();

  return (
    <StepScroll>
      <FormHeader title="Scan card" subtitle="Point the camera at the QR on the customer's phone" />

      {viewfinder}

      <InlineError message={error ?? hint} />

      {typing ? (
        <Card gap={12}>
          <Field label="Card code" hint="Printed under the QR in their WhatsApp message.">
            <CashierInput
              value={typed}
              onChangeText={(next) => setTyped(next.toUpperCase())}
              placeholder="ABCD-EFGH-JKLM"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={submitTyped}
            />
          </Field>
          <CashierButton
            label="Open customer"
            onPress={submitTyped}
            disabled={typed.trim().length === 0}
            loading={resolving}
          />
        </Card>
      ) : (
        <CashierButton
          label="Enter the code instead"
          variant="outline"
          align="left"
          icon={<KeyboardIcon size={18} color={t.fg2} />}
          onPress={() => setTyping(true)}
        />
      )}

      <CashierButton
        label="Search by name or number"
        variant="ghost"
        align="left"
        icon={<Search size={18} color={t.fg3} />}
        onPress={onBack}
      />
    </StepScroll>
  );
}
