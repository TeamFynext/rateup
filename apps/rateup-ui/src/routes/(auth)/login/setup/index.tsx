import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
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
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { useChecklist, useUpdateOrgDetailsMutation } from "@/backend/org/org.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { getVerificationStatus } from "@/backend/whatsapp/settings/waSettings.api";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { SubscriptionFeaturePathName } from "@/types/enums.ts";
import { rateupLogoHorizontalWhiteTransparent } from "@/utils/constants";
import { hasFeature } from "@/utils/subscription/subscription.ts";

export const Route = createFileRoute("/(auth)/login/setup/")({
  component: RateUpOnboarding,
});

const CARD_CONFIG = {
  api: {
    icon: MessageCircle,
    iconBg: { background: "rgba(24,115,232,0.08)", color: "#1873E8" },
    title: "Connect WhatsApp Business API",
    desc: "Link your WhatsApp Business account to enable customer messaging, loyalty commands, and broadcast campaigns.",
    btnLabel: "Connect API",
  },
  payment: {
    icon: CreditCard,
    iconBg: { background: "rgba(16,185,129,0.08)", color: "#10b981" },
    title: "Add payment in Meta",
    desc: "Add a payment method to send WhatsApp messages and notification to customers.",
    btnLabel: "Add payment",
  },
  verify: {
    icon: BadgeCheck,
    iconBg: { background: "rgba(24,115,232,0.08)", color: "#1873E8" },
    title: "Verify your WhatsApp Business account",
    desc: "Complete Meta Business verification to unlock higher messaging limits.",
    btnLabel: "Check Status",
  },

  invite: {
    icon: Users,
    iconBg: { background: "rgba(124,58,237,0.08)", color: "#7c3aed" },
    title: "Invite your team members",
    desc: "Add staff to your RateUp workspace so they can handle customer messages, manage loyalty, and run campaigns.",
    btnLabel: "Invite team",
  },
  auto: {
    icon: Zap,
    iconBg: { background: "rgba(217,119,6,0.08)", color: "#d97706" },
    title: "Add WhatsApp greeting automation",
    desc: "Set up an automated welcome message for new contacts.",
    btnLabel: "Set up automation",
  },
  points: {
    icon: Settings2,
    iconBg: { background: "rgba(24,115,232,0.08)", color: "#1873E8" },
    title: "Basic settings",
    desc: "Set your program name, branding, currency, and general loyalty preferences for RateUp Cafe.",
    btnLabel: "Configure",
  },
  tiers: {
    icon: Coins,
    iconBg: { background: "rgba(217,119,6,0.08)", color: "#d97706" },
    title: "Set up points system & tiers",
    desc: "Configure earning rate (1 pt per $1 spent), redemption value (100 pts = $5), and define Bronze, Silver, and Gold tier thresholds.",
    btnLabel: "Set up",
  },
  rewards: {
    icon: Gift,
    iconBg: { background: "rgba(225,29,72,0.08)", color: "#e11d48" },
    title: "Build rewards catalog",
    desc: "Add free items, discounts, and special offers that customers can unlock by redeeming their loyalty points.",
    btnLabel: "Build catalog",
  },
  referral: {
    icon: Share2,
    iconBg: { background: "rgba(124,58,237,0.08)", color: "#7c3aed" },
    title: "Configure referral system",
    desc: "Set up referral rewards so existing members earn bonus points when they bring new customers to RateUp Cafe.",
    btnLabel: "Configure",
  },
  cmds: {
    icon: MessageCircle,
    iconBg: { background: "rgba(5,150,105,0.08)", color: "#059669" },
    title: "Create WhatsApp templates",
    desc: "Design and submit approved message templates for points updates, tier upgrades, and loyalty re-engagement campaigns.",
    btnLabel: "Create templates",
  },
  loyaltyauto: {
    icon: Bot,
    iconBg: { background: "rgba(13,148,136,0.08)", color: "#0d9488" },
    title: "Create loyalty automations",
    desc: "Build automated WhatsApp flows — welcome messages, milestone rewards, win-back campaigns, and birthday bonuses.",
    btnLabel: "Set up automations",
  },
};

/** Onboarding card ids, shared by CARD_CONFIG, CARD_ROUTES and the sections. */
type OnboardingCardId = keyof typeof CARD_CONFIG;

/** One collapsible group of onboarding cards. */
interface OnboardingSection {
  id: string;
  title: string;
  sub: string;
  cards: OnboardingCardId[];
}

// `verify` has no destination — it is verified in place, not navigated to.
const CARD_ROUTES: Partial<Record<OnboardingCardId, string>> = {
  api: "/dashboard/settings/channels/whatsapp",
  payment: "https://business.facebook.com/latest/billing_hub/accounts/details/",
  invite: "/dashboard/settings/users",
  auto: "/dashboard/automation",
  points: "/dashboard/loyalty/settings",
  tiers: "/dashboard/loyalty/earning-rules",
  rewards: "/dashboard/loyalty/rewards",
  referral: "/dashboard/loyalty/customers",
  cmds: "/dashboard/loyalty/templates",
  loyaltyauto: "/dashboard/loyalty/dashboard",
};

function RateUpOnboarding() {
  const SECTIONS: OnboardingSection[] = [
    {
      id: "whatsapp",
      title: "Connect WhatsApp",
      sub: "API setup and business account verification",
      cards: ["api", "verify", "payment"],
    },
    {
      id: "team",
      title: "Team & automation",
      sub: "Invite staff and configure automated responses",
      cards: ["invite", "auto"],
    },
    {
      id: "loyalty",
      title: "Design your loyalty program",
      sub: "Basic settings, points, tiers, rewards, referrals, templates & automations",
      cards: ["points", "tiers", "rewards", "referral", "cmds", "loyaltyauto"],
    },
  ];
  const [localChecklist, setLocalChecklist] = useState({});
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const navigate = useNavigate();
  const { data: sub, isLoading: isSubLoading } = useSubscription();
  const { data: waSettings, isLoading } = useWaSettings();

  const updateOrg = useUpdateOrgDetailsMutation();
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
  }, [hasLoyaltyFeature]);

  const checklistMap = useMemo(() => {
    const base = checklist?.onboardingChecklist || {};

    let merged = {
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

  const handleToggle = async (key: string, value: boolean) => {
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
            queryKey: ["onboarding-checklist"],
          });
        },
      },
    );
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
        <div className="flex items-center gap-2">
          <img
            src={`${rateupLogoHorizontalWhiteTransparent}`}
            alt="RateUp Logo"
            className="w-20 sm:w-24 h-auto"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 border-gray-200"
            onClick={() => window.open("https://www.youtube.com/@TeamRateup", "_blank")}
          >
            <Video size={12} /> Watch intro
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 border-gray-200"
            onClick={() => window.open("https://docs.rateup.app", "_blank")}
          >
            <BookOpen size={12} /> View docs
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 border-gray-200"
            onClick={() => {
              const phone = import.meta.env.VITE_SUPPORT_WHATSAPP;
              const message = encodeURIComponent("Hi, I need help with support");

              window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
            }}
          >
            <Headphones size={12} /> Support
          </Button>

          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 text-white border-none"
            style={{ background: "#1873E8" }}
            onClick={() =>
              navigate({
                to: "/bookdemo",
              })
            }
          >
            <CalendarDays size={12} /> Book a demo
          </Button>
        </div>
      </nav>
      <div className="w-full max-w-5xl">
        {/* hero */}
        <div
          className="mt-6 mx-4 sm:mx-8 rounded-[18px] p-4 sm:p-7 px-4 sm:px-8 relative overflow-hidden"
          style={{ background: "#1873E8" }}
        >
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
                  Hello, there! Let's get started.
                </h1>
              </div>

              <p className="text-xs sm:text-[13.5px] text-white/70 leading-[1.65] max-w-120 m-0">
                Welcome to RateUp — connect your WhatsApp, Invite Team members, build automations,
                configure your loyalty program, and launch your first campaign.
              </p>
            </div>

            {/* Right stats */}
            <div className="flex gap-2.5 shrink-0">
              {[
                { val: doneTasks, label: "completed" },
                { val: remainingTasks, label: "remaining" },
              ].map(({ val, label }) => (
                <div
                  key={label}
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
            <div className="flex justify-between mb-2">
              <span className="text-xs text-white/60">Overall setup progress</span>
              <span className="text-xs font-bold text-white">
                {doneTasks} of {totalTasks} tasks complete
              </span>
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
              onNavigate={(id: OnboardingCardId) =>
                navigate({
                  to: CARD_ROUTES[id],
                })
              }
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
            style={{ background: "#1873E8" }}
            onClick={() => {
              const finalChecklist = { ...checklistMap };

              const allDone = Object.values(finalChecklist).every(Boolean);

              updateOrg.mutate({
                onboardingChecklist: finalChecklist,
                onboardingChecklistCompleted: allDone,
              });

              navigate({
                to: "/dashboard/inbox?tab=open",
              });
            }}
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
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
}: {
  section: OnboardingSection;
  defaultOpenSectionId: string;
  checklistMap: Record<string, boolean>;
  onToggle: (key: string, value: boolean) => void;
  onNavigate: (id: OnboardingCardId) => void;
  verificationStatus: string | null;
  setVerificationStatus: (status: string | null) => void;
  isCheckingVerification: boolean;
  setIsCheckingVerification: (checking: boolean) => void;
  waConnected: boolean;
}) {
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
  const getSectionState = (section: OnboardingSection) => {
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
              className="flex w-full items-center gap-3.5 px-4 sm:px-5 text-left cursor-pointer select-none"
            />
          }
        >
          {/* Progress ring */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{
              border: allDone
                ? "2px solid #10b981"
                : partial
                  ? "2px solid rgb(24,115,232)"
                  : "2px solid #e5e7eb",
              background: allDone ? "#10b981" : partial ? "rgba(24,115,232,0.1)" : "transparent",
            }}
          >
            {allDone && <CheckCircle2 size={14} color="white" />}
          </div>
          {/* Title */}
          <div className="flex-1">
            <span className="block text-sm font-bold">{section.title}</span>
            <span className="block text-xs text-gray-400">{section.sub}</span>
          </div>
          {/* Count */}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {doneCount} / {total}
          </span>
          <ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
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
                    const cfg = CARD_CONFIG[id];
                    const Icon = cfg.icon;
                    const done = !!checklistMap[id];

                    return (
                      <Card
                        key={id}
                        className={`border rounded-[10px] ${
                          done ? "border-green-200" : "border-gray-200"
                        }`}
                      >
                        <CardContent className="flex items-center gap-2">
                          {/* Icon */}
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                            style={cfg.iconBg}
                          >
                            <Icon size={18} />
                          </div>

                          {/* Text */}
                          <div className="flex-1">
                            <p className={`text-sm font-bold`}>{cfg.title}</p>
                            <p className="text-xs text-gray-500">{cfg.desc}</p>
                            {id === "verify" && (
                              <div className="mt-1 flex items-center gap-1.5">
                                {verificationStatus === "verified" && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                    <CheckCircle2 size={12} />
                                    Verified
                                  </span>
                                )}

                                {verificationStatus === "pending" && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                    <Loader2 size={12} className="animate-spin" />
                                    Under review
                                  </span>
                                )}

                                {verificationStatus === "not_verified" && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                                    <XCircle size={12} />
                                    Not verified
                                  </span>
                                )}

                                {verificationStatus === "ineligible" && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                    Not eligible
                                  </span>
                                )}

                                {isCheckingVerification && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                    <Loader2 size={12} className="animate-spin" />
                                    Checking...
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action */}
                          <div className="w-full sm:w-35 flex flex-col items-center">
                            {done ? (
                              <span className="text-xs text-green-600 font-semibold">✓ Done</span>
                            ) : (
                              <Button
                                size="sm"
                                className="text-xs w-full text-white disabled:opacity-50"
                                style={{ background: "rgb(24,115,232)" }}
                                disabled={id === "verify" && !waConnected}
                                onClick={async () => {
                                  if (id === "verify") {
                                    await handleVerify();
                                  } else if (id === "payment") {
                                    window.open(CARD_ROUTES[id], "_blank");
                                  } else {
                                    onNavigate(id);
                                  }
                                }}
                              >
                                {id === "verify"
                                  ? isCheckingVerification
                                    ? "Checking..."
                                    : "Check Status"
                                  : cfg.btnLabel}
                              </Button>
                            )}

                            {/* Checkbox */}

                            <div className="flex items-center gap-1 mt-2">
                              <Checkbox
                                checked={done}
                                onCheckedChange={(val) => onToggle(id, val)}
                              />
                              <span className="text-xs">Mark done</span>
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
