import { useState } from "react";
import { Modal, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { ChevronDown, Sparkles, UserCheck } from "lucide-react-native";

import type { MetaAgentThreadOwner } from "@/api/inbox/types";
import { useReleaseToMetaAi } from "@/api/metaAgent/metaAgent.query";
import { useWaSettings } from "@/api/whatsapp/template/whatsapp.query";
import { Toast } from "@/components/common/Notice";
import Tap from "@/components/common/Tap";
import { SheetButton } from "@/components/contactInfo/ContactIdentitiesSection";
import { getInboxRowTheme, type InboxRowTheme } from "@/constants/inboxDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useContactsStore } from "@/store/inboxStore";
import {
  THREAD_STATES,
  canHandBack,
  digits,
  findThreadNumber,
  reasonLabel,
  threadState,
  type ThreadState,
} from "@/utils/metaAgentThread";

type ThreadRow = {
  id: string;
  phone?: string | null;
  metaAgentThreadOwner?: MetaAgentThreadOwner | null;
  metaAgentThreadOwnerAt?: string | null;
  metaAgentHandoverReason?: string | null;
  metaAgentInvolved?: boolean;
  metadata?: { phone_number_id?: string } | null;
  lastMessage?: { sourceIdentifier?: string | null } | null;
};

function pillColors(state: ThreadState, t: InboxRowTheme) {
  if (state === "AI") return { bg: t.brandSoft, fg: t.brand };
  if (state === "STAFF") return { bg: t.warmSoft, fg: t.warmStrong };
  return { bg: t.surface2, fg: t.fg3 };
}

/**
 * Who answers this customer when the number has the Meta Business Agent: Meta AI, or staff
 * after a handover. A small pill beside the name; tapping it explains the state and, when
 * staff hold the thread, hands it back to Meta AI. Mirrors rateup-ui's `MetaAgentThreadBadge`.
 * Renders nothing for a customer Meta AI has never been involved with.
 */
export default function MetaAgentThreadBadge({ row }: Readonly<{ row: ThreadRow | undefined }>) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const state = threadState(row);
  const releasableHere = canHandBack(state, row?.phone);
  const { data: numbers } = useWaSettings(open && releasableHere);
  const release = useReleaseToMetaAi();

  if (!row || !state) return null;
  const view = THREAD_STATES[state];
  const colors = pillColors(state, t);
  const reason = reasonLabel(row.metaAgentHandoverReason);
  const since = row.metaAgentThreadOwnerAt
    ? dayjs(row.metaAgentThreadOwnerAt).format("D MMM, h:mm A")
    : null;
  const number = releasableHere ? findThreadNumber(numbers, row) : undefined;
  const allowed = can("inbox.reply") || can("meta_agent.use");
  const unmatched = releasableHere && !!numbers && !number?.id;

  const handBack = () => {
    if (!number?.id || !row.phone) return;
    release.mutate(
      { waSettingsId: number.id, to: `+${digits(row.phone)}` },
      {
        onSuccess: () => {
          // No webhook comes back to the app that releases, so the row is updated here;
          // the API records the same and tells the other screens.
          useContactsStore.getState().patchContactRows(row.id, {
            metaAgentThreadOwner: "AI",
            metaAgentThreadOwnerAt: new Date().toISOString(),
            metaAgentHandoverReason: "released",
          });
          setOpen(false);
          Toast.show({ type: "success", text1: "Handed back to Meta AI" });
        },
        onError: (error) =>
          Toast.show({
            type: "error",
            text1: "Could not hand it back",
            text2:
              (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              "Please try again.",
          }),
      },
    );
  };

  const Icon = state === "STAFF" ? UserCheck : Sparkles;

  return (
    <>
      <Tap
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={view.title}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: colors.bg,
        }}
        pressedStyle={{ opacity: 0.7 }}
      >
        <Icon size={11} color={colors.fg} />
        <Text
          maxFontSizeMultiplier={1.2}
          style={{ fontSize: 10, fontFamily: "InstrumentSans_700Bold", color: colors.fg }}
        >
          {view.label}
        </Text>
        <ChevronDown size={10} color={colors.fg} />
      </Tap>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <Tap style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View
            style={{
              backgroundColor: t.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 20 + insets.bottom,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={18} color={colors.fg} />
              </View>
              <Text
                style={{ flex: 1, fontSize: 17, fontFamily: "Figtree_800ExtraBold", color: t.fg1 }}
              >
                {view.title}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                fontFamily: "InstrumentSans_400Regular",
                color: t.fg2,
              }}
            >
              {view.body}
            </Text>
            {reason || since ? (
              <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: t.fg4 }}>
                {[reason, since].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
            {unmatched ? (
              <Text
                style={{
                  fontSize: 12,
                  lineHeight: 17,
                  fontFamily: "InstrumentSans_400Regular",
                  color: t.fg3,
                }}
              >
                This customer's WhatsApp number could not be matched to a connected number, so it
                can only be handed back from the web dashboard (Meta AI Agent → Test).
              </Text>
            ) : null}
            <View style={{ gap: 10, marginTop: 4 }}>
              {releasableHere && allowed && !unmatched ? (
                <SheetButton
                  label={release.isPending ? "Handing back…" : "Hand back to Meta AI"}
                  kind="primary"
                  t={t}
                  disabled={release.isPending || !number?.id}
                  onPress={handBack}
                />
              ) : null}
              <SheetButton label="Close" kind="secondary" t={t} onPress={() => setOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
