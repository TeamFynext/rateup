import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, SlideInLeft, SlideInRight, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Check, Send, X } from "lucide-react-native";
import { useTeamsByUser } from "@/api/teams/teams.query";
import { useContactById } from "@/api/inbox/contacts/contacts.query";
import {
  useSendWaTemplateToUser,
  useWaSettings,
  useWaTemplates,
} from "@/api/whatsapp/template/whatsapp.query";
import type { WaTemplate } from "@/api/whatsapp/types";
import { Colors } from "@/constants/colors";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import useTemplatesAvailableForTeam from "./templates/team";
import PickTemplateStep, { type Option } from "./templates/PickTemplateStep";
import FillVariablesStep from "./templates/FillVariablesStep";
import ReviewStep from "./templates/ReviewStep";
import {
  buildBodyParameterData,
  getBodyVariables,
  getMissingVariables,
} from "./templates/templateVariables";

type Step = "pick" | "fill" | "review";

const STEP_TITLE: Record<Step, string> = {
  pick: "Choose a template",
  fill: "Personalize",
  review: "Review & send",
};
const STEP_LABEL: Record<Step, string> = { pick: "Choose", fill: "Personalize", review: "Send" };

type Props = {
  visible: boolean;
  onClose: () => void;
  contactId: string;
  /** The chat's WhatsApp number; picked by default when it is one of the org's accounts. */
  defaultAccountId?: string;
};

/**
 * Sends a WhatsApp template in steps: choose it, fill its variables (skipped when
 * it has none), then review and send. The contents mount fresh on every open.
 */
export default function TemplateSending({ visible, onClose, contactId, defaultAccountId }: Props) {
  // Android's back button steps back through the flow before it closes the sheet.
  const backRef = useRef(onClose);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => backRef.current()}
    >
      {visible ? (
        <TemplateSheet
          onClose={onClose}
          contactId={contactId}
          defaultAccountId={defaultAccountId}
          backRef={backRef}
        />
      ) : null}
    </Modal>
  );
}

function TemplateSheet({
  onClose,
  contactId,
  defaultAccountId,
  backRef,
}: Omit<Props, "visible"> & { backRef: React.MutableRefObject<() => void> }) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // ---- data ----
  const contact = useContactById(contactId).data as any;
  const teamsQuery = useTeamsByUser();
  const settingsQuery = useWaSettings();
  const templatesQuery = useWaTemplates();

  const teams: Option[] = useMemo(
    () => (teamsQuery.data?.data ?? []).map((tm: any) => ({ value: tm.id, label: tm.name })),
    [teamsQuery.data],
  );
  // The settings list carries every connected channel; only rows with a number are WhatsApp.
  const accounts: Option[] = useMemo(
    () =>
      (settingsQuery.data ?? [])
        .filter((a) => a.phone && a.phoneId)
        .map((a) => ({
          value: a.phoneId,
          label: a.phoneDisplayName ? `${a.phoneDisplayName} · ${a.phone}` : a.phone,
        })),
    [settingsQuery.data],
  );

  // ---- choices ----
  const [pickedTeamId, setTeamId] = useState("");
  const [pickedAccountId, setAccountId] = useState("");
  const teamId = pickedTeamId || teams[0]?.value || "";
  const accountId =
    pickedAccountId ||
    accounts.find((a) => a.value === defaultAccountId)?.value ||
    accounts[0]?.value ||
    "";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [template, setTemplate] = useState<WaTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showMissing, setShowMissing] = useState<string[]>([]);

  const available = useTemplatesAvailableForTeam(teamId);
  const approved = useMemo(
    () => available.filter((tpl) => tpl?.data?.status === "APPROVED"),
    [available],
  );

  const variables = useMemo(() => getBodyVariables(template?.data.components), [template]);

  // ---- steps ----
  const steps: Step[] = variables.length > 0 ? ["pick", "fill", "review"] : ["pick", "review"];
  const [step, setStep] = useState<Step>("pick");
  const [direction, setDirection] = useState<1 | -1>(1);
  const index = steps.indexOf(step);

  const goTo = (next: Step) => {
    setDirection(steps.indexOf(next) >= index ? 1 : -1);
    setStep(next);
  };
  const back = () => (index > 0 ? goTo(steps[index - 1]) : onClose());

  useEffect(() => {
    backRef.current = back;
  });

  // ---- sending ----
  const send = useSendWaTemplateToUser(contact?.phone, contact?.id);
  const [sent, setSent] = useState(false);

  const selectTemplate = (tpl: WaTemplate) => {
    Haptics.selectionAsync().catch(() => {});
    if (tpl.id !== template?.id) {
      setTemplate(tpl);
      setValues({});
      setShowMissing([]);
    }
    setDirection(1);
    setStep(getBodyVariables(tpl.data.components).length > 0 ? "fill" : "review");
  };

  const toReview = () => {
    const missing = getMissingVariables(variables, values).map((v) => v.key);
    setShowMissing(missing);
    if (missing.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    goTo("review");
  };

  const handleSend = async () => {
    if (!template) return;
    try {
      await send.mutateAsync({
        templateId: template.id,
        parameterData: buildBodyParameterData(variables, values),
        teamId,
        whatsappSettingsPhoneId: accountId,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSent(true);
      setTimeout(onClose, 900);
    } catch {
      // The mutation shows the error toast.
    }
  };

  const loading = teamsQuery.isLoading || settingsQuery.isLoading;
  const canSend = !!template && !!teamId && !!accountId && !!contact?.phone && !send.isPending;
  const contactLabel = contact
    ? [contact.name, contact.phone].filter(Boolean).join(" · ")
    : "Loading…";
  const suggestions = [
    contact?.name ? { label: "Name", value: String(contact.name) } : null,
    contact?.phone ? { label: "Phone", value: String(contact.phone) } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  // ---- footer button for the current step ----
  let footer: { label: string; onPress: () => void; disabled?: boolean; icon?: boolean } | null =
    null;
  if (step === "pick" && template) {
    footer = { label: "Continue", onPress: () => selectTemplate(template) };
  } else if (step === "fill") {
    footer = { label: "Review", onPress: toReview };
  } else if (step === "review") {
    footer = { label: "Send template", onPress: handleSend, disabled: !canSend, icon: true };
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, justifyContent: "flex-end" }}
    >
      <Pressable
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={onClose}
        accessibilityLabel="Close"
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
        />
      </Pressable>

      <View
        style={{
          height: height * 0.88,
          backgroundColor: t.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          overflow: "hidden",
        }}
      >
        {/* Grabber */}
        <View
          style={{
            alignSelf: "center",
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: t.border1,
            marginTop: 8,
          }}
        />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 4,
            gap: 4,
          }}
        >
          <Pressable
            onPress={back}
            hitSlop={8}
            disabled={index === 0}
            accessibilityLabel="Back"
            style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
          >
            {index > 0 ? <ArrowLeft size={22} color={t.fg1} /> : null}
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: t.fg1, fontSize: 17, fontFamily: "Figtree_800ExtraBold" }}>
              {STEP_TITLE[step]}
            </Text>
            <Text numberOfLines={1} style={{ color: t.fg3, fontSize: 12, marginTop: 1 }}>
              To {contactLabel}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.surface2,
            }}
          >
            <X size={18} color={t.fg2} />
          </Pressable>
        </View>

        {/* Progress */}
        <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
          {steps.map((s, i) => (
            <View key={s} style={{ flex: 1, gap: 5 }}>
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i <= index ? t.brand : t.border1,
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: i === index ? t.fg1 : t.fg4,
                  fontFamily: i === index ? "InstrumentSans_700Bold" : "InstrumentSans_600SemiBold",
                }}
              >
                {i + 1}. {STEP_LABEL[s]}
              </Text>
            </View>
          ))}
        </View>

        {/* Step body */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={t.brand} />
        ) : (
          <Animated.View
            key={step}
            entering={(direction === 1 ? SlideInRight : SlideInLeft).duration(220)}
            style={{ flex: 1 }}
          >
            {step === "pick" && (
              <PickTemplateStep
                templates={approved}
                loading={templatesQuery.isLoading}
                selectedId={template?.id ?? ""}
                onSelect={selectTemplate}
                search={search}
                onSearch={setSearch}
                category={category}
                onCategory={setCategory}
                teams={teams}
                teamId={teamId}
                onTeam={(id) => {
                  setTeamId(id);
                  // A form template may not be available to the new team.
                  setTemplate(null);
                }}
                accounts={accounts}
                accountId={accountId}
                onAccount={setAccountId}
              />
            )}
            {step === "fill" && (
              <FillVariablesStep
                components={template?.data.components}
                variables={variables}
                values={values}
                onChange={(key, value) => {
                  setValues((v) => ({ ...v, [key]: value }));
                  setShowMissing((m) => m.filter((k) => k !== key));
                }}
                suggestions={suggestions}
                showMissing={showMissing}
              />
            )}
            {step === "review" && template && (
              <ReviewStep
                templateName={template.data.name}
                components={template.data.components}
                variables={variables}
                values={values}
                to={contactLabel}
                from={accounts.find((a) => a.value === accountId)?.label ?? ""}
                team={teams.find((tm) => tm.value === teamId)?.label ?? ""}
              />
            )}
          </Animated.View>
        )}

        {/* Pinned action */}
        {footer && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: insets.bottom + 12,
              borderTopWidth: 1,
              borderTopColor: t.border1,
              backgroundColor: t.surface,
            }}
          >
            {/* Styled on an inner View: NativeWind drops a Pressable's function style. */}
            <Pressable
              onPress={footer.onPress}
              disabled={footer.disabled}
              accessibilityRole="button"
            >
              <View
                style={{
                  height: 50,
                  borderRadius: 14,
                  backgroundColor: Colors.brand.blue,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: footer.disabled ? 0.5 : 1,
                }}
              >
                {send.isPending && step === "review" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text
                      style={{ color: "#fff", fontSize: 16, fontFamily: "InstrumentSans_700Bold" }}
                    >
                      {footer.label}
                    </Text>
                    {footer.icon && <Send size={17} color="#fff" />}
                  </>
                )}
              </View>
            </Pressable>
          </View>
        )}

        {/* Sent */}
        {sent && (
          <Animated.View
            entering={FadeIn.duration(150)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: t.surface,
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <Animated.View
              entering={ZoomIn.springify().damping(12)}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: t.success,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={38} color="#fff" strokeWidth={3} />
            </Animated.View>
            <Text style={{ color: t.fg1, fontSize: 17, fontFamily: "Figtree_800ExtraBold" }}>
              Template sent
            </Text>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
