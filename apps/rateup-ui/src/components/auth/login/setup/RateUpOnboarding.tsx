// Extracted verbatim from the `/(auth)/login/setup/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Coins,
  CreditCard,
  Gift,
  Headphones,
  Loader2,
  MessageCircle,
  Settings2,
  Share2,
  Users,
  Video,
  XCircle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { subscriptionKeys } from "@/backend/campaign/campaign.keys";
import type { OnboardingChecklist } from "@/backend/org/org.api";
import { useChecklist, useUpdateOrgDetailsMutation } from "@/backend/org/org.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { getVerificationStatus } from "@/backend/whatsapp/settings/waSettings.api";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { cn } from "@/lib/utils.ts";
import { SubscriptionFeaturePathName } from "@/types/enums.ts";
import { rateupLogoHorizontalWhiteTransparent } from "@/utils/constants";
import { hasFeature } from "@/utils/subscription/subscription.ts";

/** The setup steps rendered by this page; mirrors the API's checklist keys. */
type CardId = keyof OnboardingChecklist;

/** Per-step completion flags. */
type ChecklistMap = Partial<Record<CardId, boolean>>;

interface Section {
  id: string;
  title: string;
  sub: string;
  cards: CardId[];
}

/** A step's icon plus its badge styling — a Tailwind class pair or a literal brand colour. */
interface CardIcon {
  icon: LucideIcon;
  iconClass?: string;
  iconBg?: CSSProperties;
}

const CARD_ICONS: Record<CardId, CardIcon> = {
  api: { icon: MessageCircle, iconClass: "bg-primary/10 text-primary" },
  payment: { icon: CreditCard, iconBg: { background: "rgba(16,185,129,0.08)", color: "#10b981" } },
  verify: { icon: BadgeCheck, iconClass: "bg-primary/10 text-primary" },
  invite: { icon: Users, iconBg: { background: "rgba(124,58,237,0.08)", color: "#7c3aed" } },
  auto: { icon: Zap, iconBg: { background: "rgba(217,119,6,0.08)", color: "#d97706" } },
  points: { icon: Settings2, iconClass: "bg-primary/10 text-primary" },
  tiers: { icon: Coins, iconBg: { background: "rgba(217,119,6,0.08)", color: "#d97706" } },
  rewards: { icon: Gift, iconBg: { background: "rgba(225,29,72,0.08)", color: "#e11d48" } },
  referral: { icon: Share2, iconBg: { background: "rgba(124,58,237,0.08)", color: "#7c3aed" } },
  cmds: { icon: MessageCircle, iconBg: { background: "rgba(5,150,105,0.08)", color: "#059669" } },
  loyaltyauto: { icon: Bot, iconBg: { background: "rgba(13,148,136,0.08)", color: "#0d9488" } },
};

/** A step's icon styling plus its translated copy. */
interface CardConfig extends CardIcon {
  title: string;
  desc: string;
  btnLabel: string;
}

function useCardConfig() {
  const { t: translations } = useTranslation();

  return useMemo<Record<CardId, CardConfig>>(
    () => ({
      api: {
        ...CARD_ICONS.api,
        title: translations("Connect WhatsApp Business API"),
        desc: translations(
          "Link your WhatsApp Business account to enable customer messaging, loyalty commands, and broadcast campaigns.",
        ),
        btnLabel: translations("Connect API"),
      },
      payment: {
        ...CARD_ICONS.payment,
        title: translations("Add payment in Meta"),
        desc: translations(
          "Add a payment method to send WhatsApp messages and notification to customers.",
        ),
        btnLabel: translations("Add payment"),
      },
      verify: {
        ...CARD_ICONS.verify,
        title: translations("Verify your WhatsApp Business account"),
        desc: translations(
          "Complete Meta Business verification to unlock higher messaging limits.",
        ),
        btnLabel: translations("Check Status"),
      },
      invite: {
        ...CARD_ICONS.invite,
        title: translations("Invite your team members"),
        desc: translations(
          "Add staff to your RateUp workspace so they can handle customer messages, manage loyalty, and run campaigns.",
        ),
        btnLabel: translations("Invite team"),
      },
      auto: {
        ...CARD_ICONS.auto,
        title: translations("Add WhatsApp greeting automation"),
        desc: translations("Set up an automated welcome message for new contacts."),
        btnLabel: translations("Set up automation"),
      },
      points: {
        ...CARD_ICONS.points,
        title: translations("Basic settings"),
        desc: translations(
          "Set your program name, branding, currency, and general loyalty preferences for RateUp Cafe.",
        ),
        btnLabel: translations("Configure"),
      },
      tiers: {
        ...CARD_ICONS.tiers,
        title: translations("Set up points system & tiers"),
        desc: translations(
          "Configure earning rate (1 pt per $1 spent), redemption value (100 pts = $5), and define Bronze, Silver, and Gold tier thresholds.",
        ),
        btnLabel: translations("Set up"),
      },
      rewards: {
        ...CARD_ICONS.rewards,
        title: translations("Build rewards catalog"),
        desc: translations(
          "Add free items, discounts, and special offers that customers can unlock by redeeming their loyalty points.",
        ),
        btnLabel: translations("Build catalog"),
      },
      referral: {
        ...CARD_ICONS.referral,
        title: translations("Configure referral system"),
        desc: translations(
          "Set up referral rewards so existing members earn bonus points when they bring new customers to RateUp Cafe.",
        ),
        btnLabel: translations("Configure"),
      },
      cmds: {
        ...CARD_ICONS.cmds,
        title: translations("Create WhatsApp templates"),
        desc: translations(
          "Design and submit approved message templates for points updates, tier upgrades, and loyalty re-engagement campaigns.",
        ),
        btnLabel: translations("Create templates"),
      },
      loyaltyauto: {
        ...CARD_ICONS.loyaltyauto,
        title: translations("Create loyalty automations"),
        desc: translations(
          "Build automated WhatsApp flows — welcome messages, milestone rewards, win-back campaigns, and birthday bonuses.",
        ),
        btnLabel: translations("Set up automations"),
      },
    }),
    [translations],
  );
}

/** Meta's billing hub — external, so it opens in a new tab rather than routing. */
const META_BILLING_URL = "https://business.facebook.com/latest/billing_hub/accounts/details/";

/**
 * In-app destination per step. "verify" (handled inline) and "payment" (external,
 * see {@link META_BILLING_URL}) deliberately have no entry.
 */
const CARD_ROUTES = {
  // The WhatsApp channel page is the `$channel` route, so it needs params rather
  // than a literal "/dashboard/settings/channels/whatsapp" path.
  api: { to: "/dashboard/settings/channels/$channel", params: { channel: "whatsapp" } },
  invite: { to: "/dashboard/settings/users" },
  auto: { to: "/dashboard/automation" },
  points: { to: "/dashboard/loyalty/settings" },
  tiers: { to: "/dashboard/loyalty/earning-rules" },
  rewards: { to: "/dashboard/loyalty/rewards" },
  referral: { to: "/dashboard/loyalty/customers" },
  cmds: { to: "/dashboard/loyalty/templates" },
  loyaltyauto: { to: "/dashboard/loyalty/dashboard" },
} as const;

type NavigableCardId = keyof typeof CARD_ROUTES;

export function RateUpOnboarding() {
  const { t: translations } = useTranslation();
  const SECTIONS = useMemo<Section[]>(
    () => [
      {
        id: "whatsapp",
        title: translations("Connect WhatsApp"),
        sub: translations("API setup and business account verification"),
        cards: ["api", "verify", "payment"],
      },
      {
        id: "team",
        title: translations("Team & automation"),
        sub: translations("Invite staff and configure automated responses"),
        cards: ["invite", "auto"],
      },
      {
        id: "loyalty",
        title: translations("Design your loyalty program"),
        sub: translations(
          "Basic settings, points, tiers, rewards, referrals, templates & automations",
        ),
        cards: ["points", "tiers", "rewards", "referral", "cmds", "loyaltyauto"],
      },
    ],
    [translations],
  );
  const [localChecklist, setLocalChecklist] = useState<ChecklistMap>({});
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const navigate = useNavigate();
  const { data: sub, isLoading: isSubLoading } = useSubscription();
  const { data: waSettings, isLoading } = useWaSettings();

  const updateOrg = useUpdateOrgDetailsMutation({ showSuccessToast: false });
  const queryClient = useQueryClient();
  const waConnected = !isLoading && Boolean(waSettings?.length);
  const isSubReady = !isSubLoading && sub;

  const hasLoyaltyFeature = isSubReady
    ? hasFeature(sub, SubscriptionFeaturePathName.Whatsapp)
    : null;
  const { data: checklist } = useChecklist();

  const visibleSections = useMemo(() => {
    return SECTIONS.filter((s) => {
      if (s.id === "loyalty") return hasLoyaltyFeature;
      return true;
    });
  }, [SECTIONS, hasLoyaltyFeature]);

  const checklistMap = useMemo<ChecklistMap>(() => {
    const base: OnboardingChecklist = checklist?.onboardingChecklist ?? {};

    let merged: ChecklistMap = {
      ...base,
      ...localChecklist,
      api: waConnected || base.api,
      verify: verificationStatus === "verified" || base.verify,
    };

    if (!hasLoyaltyFeature) {
      merged = {
        ...merged,
        points: true,
        tiers: true,
        rewards: true,
        referral: true,
        cmds: true,
        loyaltyauto: true,
      };
    }

    return merged;
  }, [checklist, waConnected, localChecklist, hasLoyaltyFeature]);

  const { totalTasks, doneTasks, remainingTasks, pct } = useMemo(() => {
    const allCards = visibleSections.flatMap((s) => s.cards);

    const total = allCards.length;
    const done = allCards.filter((id) => checklistMap[id]).length;

    return {
      totalTasks: total,
      doneTasks: done,
      remainingTasks: total - done,
      pct: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  }, [visibleSections, checklistMap]);

  const handleToggle = async (key: CardId, value: boolean) => {
    setLocalChecklist((prev) => ({
      ...prev,
      [key]: value,
    }));

    await updateOrg.mutate(
      {
        onboardingChecklist: {
          ...checklistMap,
          [key]: value,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: subscriptionKeys.onboardingChecklist(),
          });
        },
      },
    );
  };

  const handleSkipSetup = () => {
    updateOrg.mutate({
      onboardingChecklist: checklistMap,
      onboardingChecklistCompleted: true,
    });

    navigate({
      to: "/dashboard/inbox",
      search: { tab: "open" },
    });
  };

  const defaultOpenSectionId = useMemo(() => {
    for (const section of visibleSections) {
      const isDone = section.cards.every((id) => checklistMap[id]);
      if (!isDone) return section.id;
    }
    return visibleSections[0]?.id;
  }, [visibleSections, checklistMap]);

  return (
    <div className="w-full flex flex-col items-center justify-center bg-[#f9fafc] dark:bg-[#121212]">
      <nav className="w-full h-16 border-b px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-50 dark:border-gray-950 backdrop-blur-md bg-white dark:bg-gray-900/80">
        {/* Left */}
        <div className="flex items-center gap-2 shrink-0">
          <img
            src={`${rateupLogoHorizontalWhiteTransparent}`}
            alt={translations("RateUp Logo")}
            className="w-20 sm:w-24 h-auto"
          />
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label={translations("Watch intro")}
            className="text-xs h-8 gap-1.5 border-gray-200 px-2 sm:px-3"
            onClick={() => window.open("https://www.youtube.com/@TeamRateup", "_blank")}
          >
            <Video size={12} />
            <span className="hidden sm:inline">{translations("Watch intro")}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            aria-label={translations("View docs")}
            className="text-xs h-8 gap-1.5 border-gray-200 px-2 sm:px-3"
            onClick={() => window.open("https://docs.rateup.app", "_blank")}
          >
            <BookOpen size={12} />
            <span className="hidden sm:inline">{translations("View docs")}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            aria-label={translations("Support")}
            className="text-xs h-8 gap-1.5 border-gray-200 px-2 sm:px-3"
            onClick={() => {
              const phone = import.meta.env.VITE_SUPPORT_WHATSAPP;
              const message = encodeURIComponent(translations("Hi, I need help with support"));

              window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
            }}
          >
            <Headphones size={12} />
            <span className="hidden sm:inline">{translations("Support")}</span>
          </Button>

          {/* There is no /bookdemo route — booking is the same modal the marketing site uses. */}
          <BookDemoModal>
            <Button
              size="sm"
              aria-label={translations("Book a demo")}
              className="text-xs h-8 gap-1.5 text-white border-none px-2 sm:px-3"
            >
              <CalendarDays size={12} />
              <span className="hidden sm:inline">{translations("Book a demo")}</span>
            </Button>
          </BookDemoModal>
        </div>
      </nav>
      <div className="w-full max-w-5xl">
        {/* hero */}
        <div className="mt-6 mx-4 sm:mx-8 rounded-[18px] p-4 sm:p-7 px-4 sm:px-8 relative overflow-hidden bg-primary">
          {/* Background circles */}
          <div className="absolute -right-8 -top-12 w-52 h-52 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-20 -bottom-16 w-40 h-40 rounded-full bg-white/5 opacity-70 pointer-events-none" />

          {/* Content */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-5 relative">
            {/* Left */}
            <div>
              <div className="flex items-center gap-3 mb-2.5">
                <span className="text-2xl sm:text-[26px] leading-none">👋</span>
                <h1 className="text-xl sm:text-[22px] font-extrabold text-white tracking-[-0.4px] leading-[1.2] m-0">
                  {translations("Hello, there! Let's get started.")}
                </h1>
              </div>

              <p className="text-xs sm:text-[13.5px] text-white/70 leading-[1.65] max-w-120 m-0">
                {translations(
                  "Welcome to RateUp — connect your WhatsApp, Invite Team members, build automations, configure your loyalty program, and launch your first campaign.",
                )}
              </p>
            </div>

            {/* Right stats */}
            <div className="flex gap-2.5 shrink-0">
              {[
                { id: "completed", val: doneTasks, label: translations("completed") },
                { id: "remaining", val: remainingTasks, label: translations("remaining") },
              ].map(({ id, val, label }) => (
                <div
                  key={id}
                  className="bg-white/10 rounded-xl py-3 px-5 text-center min-w-16 sm:min-w-18"
                >
                  <p className="text-xl sm:text-[22px] font-extrabold text-white leading-none">
                    {val}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-white/60 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 relative">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xs text-white/60">
                  {translations("Overall setup progress")}
                </span>
                <span className="text-xs font-bold text-white">
                  {translations("{done} of {total} tasks complete", {
                    done: doneTasks,
                    total: totalTasks,
                  })}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSkipSetup}
                className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-white underline-offset-4 cursor-pointer hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {translations("Skip setup")}
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-4 sm:p-8">
          {visibleSections.map((section) => (
            <CollapsibleCard
              key={section.id}
              defaultOpenSectionId={defaultOpenSectionId}
              section={section}
              checklistMap={checklistMap}
              onToggle={handleToggle}
              onNavigate={(id) => navigate(CARD_ROUTES[id])}
              verificationStatus={verificationStatus}
              setVerificationStatus={setVerificationStatus}
              isCheckingVerification={isCheckingVerification}
              setIsCheckingVerification={setIsCheckingVerification}
              waConnected={waConnected}
            />
          ))}
        </div>
        <div className="flex justify-center mb-10">
          <Button
            size="lg"
            className="text-sm px-4 sm:px-6 py-2 sm:py-3 text-white"
            onClick={() => {
              const finalChecklist = { ...checklistMap };

              const allDone = Object.values(finalChecklist).every(Boolean);

              updateOrg.mutate({
                onboardingChecklist: finalChecklist,
                onboardingChecklistCompleted: allDone,
              });

              navigate({
                to: "/dashboard/inbox",
                search: { tab: "open" },
              });
            }}
          >
            {translations("Continue to Dashboard")}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CollapsibleCardProps {
  section: Section;
  defaultOpenSectionId: string | undefined;
  checklistMap: ChecklistMap;
  onToggle: (key: CardId, value: boolean) => void;
  onNavigate: (id: NavigableCardId) => void;
  verificationStatus: string | null;
  setVerificationStatus: (status: string | null) => void;
  isCheckingVerification: boolean;
  setIsCheckingVerification: (checking: boolean) => void;
  waConnected: boolean;
}

function CollapsibleCard({
  section,
  defaultOpenSectionId,
  checklistMap,
  onToggle,
  onNavigate,
  verificationStatus,
  setVerificationStatus,
  isCheckingVerification,
  setIsCheckingVerification,
  waConnected,
}: Readonly<CollapsibleCardProps>) {
  const { t: translations } = useTranslation();
  const cardConfig = useCardConfig();
  const [open, setOpen] = useState(section?.id === defaultOpenSectionId);
  const handleVerify = async () => {
    try {
      setIsCheckingVerification(true);
      const res = await getVerificationStatus();
      if (!res) return;

      const status = res?.verificationStatus;
      setVerificationStatus(status);

      if (status === "verified") {
        onToggle("verify", true);
      } else {
        onToggle("verify", false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingVerification(false);
    }
  };
  const getSectionState = (section: Section) => {
    const total = section.cards.length;

    const doneCount = section.cards.filter((id) => checklistMap[id]).length;

    return {
      total,
      doneCount,
      allDone: doneCount === total,
      partial: doneCount > 0 && doneCount < total,
    };
  };

  useEffect(() => {
    if (section?.id === defaultOpenSectionId) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [defaultOpenSectionId]);

  const { total, doneCount, allDone, partial } = getSectionState(section);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* Header */}
      <Card
        className={`border border-gray-200 shadow-none ${
          open ? "rounded-t-xl rounded-b-none" : "rounded-xl"
        }`}
      >
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center gap-2.5 sm:gap-3.5 px-4 sm:px-5 text-left cursor-pointer select-none"
            />
          }
        >
          {/* Progress ring */}
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2",
              allDone
                ? "border-emerald-500 bg-emerald-500"
                : partial
                  ? "border-primary bg-primary/10"
                  : "border-gray-200 bg-transparent",
            )}
          >
            {allDone && <CheckCircle2 size={14} color="white" />}
          </div>
          {/* Title */}
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-bold">{section.title}</span>
            <span className="block text-xs text-gray-400">{section.sub}</span>
          </div>
          {/* Count */}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 shrink-0 whitespace-nowrap">
            {doneCount} / {total}
          </span>
          <ChevronDown className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
      </Card>
      {/* Content */}
      <CollapsibleContent keepMounted>
        <AnimatePresence initial={false} mode="wait">
          {open && (
            <motion.div
              key="collapsible-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <Card className="border border-gray-200 border-t border-dashed rounded-b-xl rounded-t-none shadow-none">
                <CardContent className="flex flex-col gap-2">
                  {section.cards.map((id) => {
                    const cfg = cardConfig[id];
                    const Icon = cfg.icon;
                    const done = !!checklistMap[id];

                    return (
                      <Card
                        key={id}
                        className={`border rounded-[10px] ${
                          done ? "border-green-200" : "border-gray-200"
                        }`}
                      >
                        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {/* Icon */}
                            <div
                              className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                                cfg.iconClass,
                              )}
                              style={cfg.iconBg}
                            >
                              <Icon size={18} />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold`}>{cfg.title}</p>
                              <p className="text-xs text-gray-500">{cfg.desc}</p>
                              {id === "verify" && (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {verificationStatus === "verified" && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                      <CheckCircle2 size={12} />
                                      {translations("Verified")}
                                    </span>
                                  )}

                                  {verificationStatus === "pending" && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                      <Loader2 size={12} className="animate-spin" />
                                      {translations("Under review")}
                                    </span>
                                  )}

                                  {verificationStatus === "not_verified" && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                                      <XCircle size={12} />
                                      {translations("Not verified")}
                                    </span>
                                  )}

                                  {verificationStatus === "ineligible" && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                      {translations("Not eligible")}
                                    </span>
                                  )}

                                  {isCheckingVerification && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                      <Loader2 size={12} className="animate-spin" />
                                      {translations("Checking...")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action */}
                          <div className="w-full sm:w-35 flex flex-col items-center shrink-0">
                            {done ? (
                              <span className="text-xs text-green-600 font-semibold">
                                ✓ {translations("Done")}
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                className="text-xs w-full text-white disabled:opacity-50"
                                disabled={id === "verify" && !waConnected}
                                onClick={async () => {
                                  if (id === "verify") {
                                    await handleVerify();
                                  } else if (id === "payment") {
                                    window.open(META_BILLING_URL, "_blank");
                                  } else {
                                    onNavigate(id);
                                  }
                                }}
                              >
                                {id === "verify"
                                  ? isCheckingVerification
                                    ? translations("Checking...")
                                    : translations("Check Status")
                                  : cfg.btnLabel}
                              </Button>
                            )}

                            {/* Checkbox */}

                            <div className="flex items-center gap-1 mt-2">
                              <Checkbox
                                checked={done}
                                onCheckedChange={(val) => onToggle(id, val)}
                              />
                              <span className="text-xs">{translations("Mark done")}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
}
