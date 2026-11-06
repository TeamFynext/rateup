import { useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ArrowLeft, Gauge, MessageCircle, Sparkles, UserCheck } from "lucide-react-native";

import {
  useAgentBudgets,
  useConversationInsights,
  useMetaAgents,
} from "@/api/metaAgent/metaAgent.query";
import { useWaSettings } from "@/api/whatsapp/template/whatsapp.query";
import Tap from "@/components/common/Tap";
import { Pill } from "@/components/contactInfo/InfoSection";
import { getInboxHeaderBg, getInboxRowTheme, type InboxRowTheme } from "@/constants/inboxDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { budgetText } from "@/utils/metaAgentThread";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

type ApiError = { response?: { status?: number; data?: { reason?: string; message?: string } } };

/**
 * Meta AI usage, per WhatsApp number that has the Meta Business Agent: how many
 * conversations it replied in over a period, how many it has handed to the team and are
 * waiting now, and the usage caps that stop it. Setting the agent up stays on the web.
 */
export default function MetaAiScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const allowed = can("meta_agent.read");
  const [days, setDays] = useState<number>(7);
  const [refreshing, setRefreshing] = useState(false);

  const { data: settings, isLoading: loadingNumbers } = useWaSettings(allowed);
  // `/api/wa/settings` also lists Instagram and Messenger accounts; the agent is WhatsApp only.
  const numbers = useMemo(
    () => (settings ?? []).filter((s) => s.id && s.phoneId && !s.ibaId && !s.fbPageId),
    [settings],
  );
  const agents = useMetaAgents(
    numbers.map((n) => n.id!),
    allowed,
  );
  const live = numbers.filter((_, i) => agents[i]?.data?.status === "ONBOARDED");
  const loadingAgents = agents.some((a) => a.isLoading);
  const subscriptionBlocked = agents.some(
    (a) => (a.error as ApiError | null)?.response?.data?.reason === "subscription",
  );

  const range = useMemo(
    () => ({
      start_date: dayjs()
        .subtract(days - 1, "day")
        .format("YYYY-MM-DD"),
      end_date: dayjs().format("YYYY-MM-DD"),
    }),
    [days],
  );

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["meta-agent"] });
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: getInboxHeaderBg(isDark),
          borderBottomWidth: 1,
          borderBottomColor: t.border1,
        }}
      >
        <Tap
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/protected/more" as never)
          }
          style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={21} color={t.fg1} />
        </Tap>
        <Text style={{ fontSize: 15, fontFamily: "Figtree_800ExtraBold", color: t.fg1 }}>
          Meta AI
        </Text>
      </View>

      {!allowed ? (
        <Note t={t} text="You don't have access to the Meta AI agent. Ask an admin." />
      ) : loadingNumbers || loadingAgents ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : subscriptionBlocked ? (
        <Note t={t} text="Meta AI isn't included in your plan. Upgrade from the web dashboard." />
      ) : live.length === 0 ? (
        <Note
          t={t}
          text="None of your WhatsApp numbers has Meta AI turned on yet. Set it up from the web dashboard under Meta AI Agent."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          <View
            style={{
              flexDirection: "row",
              backgroundColor: t.surface2,
              borderRadius: 10,
              padding: 3,
              borderWidth: 1,
              borderColor: t.border1,
            }}
          >
            {RANGES.map((option) => {
              const selected = option.days === days;
              return (
                <Tap
                  key={option.days}
                  onPress={() => setDays(option.days)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: "center",
                    backgroundColor: selected ? t.surface : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "InstrumentSans_600SemiBold",
                      color: selected ? t.fg1 : t.fg3,
                    }}
                  >
                    {option.label}
                  </Text>
                </Tap>
              );
            })}
          </View>

          {live.map((number) => (
            <NumberCard
              key={number.id}
              t={t}
              waSettingsId={number.id!}
              title={number.phoneDisplayName || number.phone}
              subtitle={number.phoneDisplayName ? number.phone : undefined}
              range={range}
              days={days}
            />
          ))}

          <Text
            style={{
              fontSize: 12,
              lineHeight: 17,
              fontFamily: "InstrumentSans_400Regular",
              color: t.fg4,
            }}
          >
            Figures come from Meta and can lag by a few hours. Change usage caps, knowledge and
            skills from the web dashboard.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

function NumberCard({
  t,
  waSettingsId,
  title,
  subtitle,
  range,
  days,
}: Readonly<{
  t: InboxRowTheme;
  waSettingsId: string;
  title: string;
  subtitle?: string;
  range: { start_date: string; end_date: string };
  days: number;
}>) {
  const insights = useConversationInsights(waSettingsId, range);
  const budgets = useAgentBudgets(waSettingsId);
  // Meta answers a list with one entry per range; the counts sit on that entry.
  const row = insights.data?.data?.[0];
  const replied = row?.ai_threads?.count;
  const waiting = row?.ai_handoffs?.count;

  return (
    <View
      style={{
        backgroundColor: t.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.border1,
        padding: 16,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: t.brandSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={18} color={t.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 15, fontFamily: "Figtree_800ExtraBold", color: t.fg1 }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: t.fg3 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Pill text="Live" tone="brand" />
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Stat
          t={t}
          icon={<MessageCircle size={15} color={t.brand} />}
          label={`Conversations it replied in, last ${days} days`}
          value={replied}
          loading={insights.isLoading}
        />
        <Stat
          t={t}
          icon={<UserCheck size={15} color={t.warmStrong} />}
          label="Handed to your team, waiting now"
          value={waiting}
          loading={insights.isLoading}
        />
      </View>
      {insights.isError ? (
        <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: t.danger }}>
          Could not load figures from Meta. Pull down to try again.
        </Text>
      ) : null}

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Gauge size={14} color={t.fg3} />
          <Text style={{ fontSize: 13, fontFamily: "InstrumentSans_700Bold", color: t.fg2 }}>
            Usage caps
          </Text>
        </View>
        {budgets.isLoading ? (
          <ActivityIndicator style={{ alignSelf: "flex-start" }} />
        ) : budgets.isError ? (
          <Text style={{ fontSize: 13, fontFamily: "InstrumentSans_400Regular", color: t.fg3 }}>
            Could not load the caps.
          </Text>
        ) : budgets.data?.budgets.length ? (
          budgets.data.budgets.map((budget, index) => (
            <Text
              key={budget.budget_id ?? index}
              style={{ fontSize: 13, fontFamily: "InstrumentSans_400Regular", color: t.fg1 }}
            >
              • {budgetText(budget)}
            </Text>
          ))
        ) : (
          <Text style={{ fontSize: 13, fontFamily: "InstrumentSans_400Regular", color: t.fg3 }}>
            No caps: usage is unlimited.
          </Text>
        )}
        <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: t.fg4 }}>
          When a cap is reached, Meta AI finishes its reply and hands new messages to your team.
        </Text>
      </View>
    </View>
  );
}

function Stat({
  t,
  icon,
  label,
  value,
  loading,
}: Readonly<{
  t: InboxRowTheme;
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  loading: boolean;
}>) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.surface2,
        borderRadius: 12,
        padding: 12,
        gap: 6,
      }}
    >
      {icon}
      {loading ? (
        <ActivityIndicator style={{ alignSelf: "flex-start" }} />
      ) : (
        <Text style={{ fontSize: 22, fontFamily: "Figtree_800ExtraBold", color: t.fg1 }}>
          {value === undefined ? "—" : value.toLocaleString("en-US")}
        </Text>
      )}
      <Text
        style={{
          fontSize: 12,
          lineHeight: 16,
          fontFamily: "InstrumentSans_400Regular",
          color: t.fg3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function Note({ t, text }: Readonly<{ t: InboxRowTheme; text: string }>) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text
        style={{
          fontSize: 14,
          lineHeight: 20,
          fontFamily: "InstrumentSans_400Regular",
          color: t.fg3,
          textAlign: "center",
        }}
      >
        {text}
      </Text>
    </View>
  );
}
