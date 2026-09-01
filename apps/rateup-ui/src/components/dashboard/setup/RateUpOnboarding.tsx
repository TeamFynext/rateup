// The setup guide rendered by the `/dashboard/setup/` route. Layout follows the
// "Onboarding Setup v2" design: required Meta steps first, then extra channels,
// then the optional work. The step rail from that design is the app sidebar's
// "Get started" section (see `setup.nav.tsx`) rather than a second rail in here.

import { IconArrowRight, IconCircleCheck, IconCircleX, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { subscriptionKeys } from "@/backend/campaign/campaign.keys";
import {
  useChecklist,
  useOrgNameAndPhone,
  useUpdateOrgDetailsMutation,
} from "@/backend/org/org.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { getVerificationStatus } from "@/backend/whatsapp/settings/waSettings.api";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { ConnectChannelButton } from "@/components/common/connect-channel-button.tsx";
import { ContinueWithFacebookButton } from "@/components/common/continue-with-facebook-button.tsx";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import { SetupRowCard } from "@/components/common/setup-row-card.tsx";
import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { SubscriptionFeaturePathName } from "@/types/enums.ts";
import { rateupIcon } from "@/utils/constants";
import { hasFeature } from "@/utils/subscription/subscription.ts";

import type { CardId, ChecklistMap, ConnectionState, TaskDef, TaskGroup } from "./setup.tasks.ts";
import {
  CARD_ROUTES,
  getSetupProgress,
  isNavigable,
  isTaskBlocked,
  isTaskSkippable,
  derivedDone,
  META_BILLING_URL,
  setupCopy,
} from "./setup.tasks.ts";

export function RateUpOnboarding({ step }: Readonly<{ step?: string }>) {
  const { t: translations } = useTranslation();
  const copy = useMemo(() => setupCopy(translations), [translations]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /** The guide's own scroller, so "back to the top" has one unambiguous target. */
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [localChecklist, setLocalChecklist] = useState<ChecklistMap>({});
  const [localSkips, setLocalSkips] = useState<ChecklistMap>({});
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  const { data: sub, isLoading: isSubLoading } = useSubscription();
  const { data: waSettings, isLoading } = useWaSettings();
  const { data: checklist } = useChecklist();
  const { data: orgInfo } = useOrgNameAndPhone();
  const updateOrg = useUpdateOrgDetailsMutation({ showSuccessToast: false });

  // Straight from the WhatsApp settings, which is where every Meta link is recorded.
  const connected = useMemo<ConnectionState>(
    () =>
      isLoading
        ? {}
        : {
            whatsapp: Boolean(waSettings?.length),
            instagram: waSettings?.some((setting) => setting.ibaId?.length) ?? false,
            messenger: waSettings?.some((setting) => setting.fbPageId?.length) ?? false,
          },
    [waSettings, isLoading],
  );
  const isSubReady = !isSubLoading && sub;
  const hasLoyaltyFeature = isSubReady
    ? hasFeature(sub, SubscriptionFeaturePathName.Whatsapp)
    : null;

  const { visibleTasks, checklistMap, skippedMap, doneTasks, totalTasks, minsLeft, pct, allDone } =
    useMemo(
      () =>
        getSetupProgress({
          checklist: checklist?.onboardingChecklist,
          connected,
          hasLoyaltyFeature,
          overrides: {
            ...localChecklist,
            ...(verificationStatus === "verified" ? { verify: true } : {}),
          },
          skipOverrides: localSkips,
        }),
      [checklist, connected, hasLoyaltyFeature, localChecklist, localSkips, verificationStatus],
    );

  /** The sidebar points at a step with `?step=`; that is what the guide highlights. */
  const focused = visibleTasks.find((task) => task.id === step)?.id;

  // Picking a step in the sidebar is a link, so bring its card into view — that is
  // what selecting one is for. Runs when the subscription resolves too, since the
  // loyalty step is not in `visibleTasks` until then.
  //
  // On the frame after the effect, so the card is laid out when we measure it. The
  // sidebar rows navigate with `resetScroll: false`; without that the router's
  // scroll restoration resets to the top afterwards and undoes this.
  useEffect(() => {
    // Nothing left to point at once the guide is finished — the top of the page is.
    if (!focused || allDone) return;

    const frame = requestAnimationFrame(() => {
      document.getElementById(`setup-task-${focused}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [focused, allDone]);

  // Connecting a channel completes its step, but only in what the guide derives —
  // write it through so it survives a reload and reaches the sidebar, which cannot
  // see the WhatsApp settings itself. Runs once per newly-connected channel: after
  // the write the stored checklist agrees and this finds nothing to do.
  useEffect(() => {
    const stored = checklist?.onboardingChecklist;
    if (!stored) return;

    const missing = Object.keys(derivedDone(connected)).filter(
      (key) => !stored[key as CardId],
    ) as CardId[];

    if (missing.length === 0) return;

    save({ ...checklistMap, ...Object.fromEntries(missing.map((key) => [key, true])) }, skippedMap);
    // `save` and the maps are rebuilt every render; the stored checklist and the live
    // connection are what actually decide whether there is anything to write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklist, connected]);

  // Finishing the last step swaps the header for "You're live.", which is at the top
  // of a page you are most likely at the bottom of. Only on the transition, so a
  // guide that was already complete when it loaded is left where it is.
  const wasAllDone = useRef(allDone);
  useEffect(() => {
    if (allDone && !wasAllDone.current) {
      scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }

    wasAllDone.current = allDone;
  }, [allDone]);

  /** Writes both maps together — they live in one JSON field on the org. */
  const save = (done: ChecklistMap, skipped: ChecklistMap) => {
    updateOrg.mutate(
      {
        onboardingChecklist: { ...done, skipped },
        // A skipped step is not outstanding, so waving off the last one finishes
        // the guide — and takes "Get started" out of the sidebar.
        onboardingChecklistCompleted: visibleTasks.every(
          (task) => done[task.id] || skipped[task.id],
        ),
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

  const handleToggle = (key: CardId, value: boolean) => {
    setLocalChecklist((prev) => ({ ...prev, [key]: value }));
    save({ ...checklistMap, [key]: value }, skippedMap);
  };

  const handleSkip = (key: CardId, value: boolean) => {
    setLocalSkips((prev) => ({ ...prev, [key]: value }));
    save(checklistMap, { ...skippedMap, [key]: value });
  };

  const handleVerify = async () => {
    try {
      setIsCheckingVerification(true);
      const res = await getVerificationStatus();
      if (!res) return;

      const status = res?.verificationStatus;
      setVerificationStatus(status);
      handleToggle("verify", status === "verified");
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingVerification(false);
    }
  };

  /**
   * Dismissing the guide marks the checklist complete, which is also what takes
   * the "Get started" icon out of the sidebar rail.
   */
  const hideGuide = () => {
    updateOrg.mutate(
      {
        onboardingChecklist: { ...checklistMap, skipped: skippedMap },
        onboardingChecklistCompleted: true,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: subscriptionKeys.onboardingChecklist(),
          });
        },
      },
    );

    navigate({ to: "/dashboard/inbox", search: { tab: "open" } });
  };

  const handleAction = async (id: CardId) => {
    if (id === "verify") {
      await handleVerify();
      return;
    }

    if (id === "payment") {
      window.open(META_BILLING_URL, "_blank");
      return;
    }

    if (isNavigable(id)) navigate(CARD_ROUTES[id]);
  };

  const groups: { id: TaskGroup; title: string; hint: string; required?: boolean }[] = [
    {
      id: "required",
      title: translations("Connect WhatsApp"),
      hint: translations("You can't send until these three are done"),
      required: true,
    },
    {
      id: "channels",
      title: translations("Add more channels"),
      hint: translations("One inbox for every conversation — same replies, same rules"),
    },
    {
      id: "optional",
      title: translations("Make it work for you"),
      hint: translations("Optional — do these in any order, any time"),
    },
  ];

  const tasksIn = (group: TaskGroup) => visibleTasks.filter((task) => task.group === group);

  const renderTaskCard = (task: TaskDef) => {
    const { title, desc, btnLabel } = copy[task.id];
    const done = Boolean(checklistMap[task.id]);
    const skipped = !done && Boolean(skippedMap[task.id]);
    const blocked = isTaskBlocked(task, checklistMap);

    return (
      <SetupRowCard
        key={task.id}
        id={`setup-task-${task.id}`}
        icon={task.icon}
        tint={task.tint}
        title={title}
        description={desc}
        done={done}
        muted={skipped}
        highlighted={focused === task.id}
        badges={
          <>
            {done && (
              <Badge className="bg-green-600/10 text-green-700 dark:text-green-500">
                <IconCircleCheck size={12} />
                {translations("Done")}
              </Badge>
            )}
            {skipped && <Badge variant="secondary">{translations("Skipped")}</Badge>}
            {/* Everything that waits, waits on the WhatsApp connection. */}
            {blocked && <Badge variant="secondary">{translations("Waiting on WhatsApp")}</Badge>}
          </>
        }
        detail={
          task.id === "verify" ? (
            <VerificationStatus status={verificationStatus} isChecking={isCheckingVerification} />
          ) : null
        }
        action={
          skipped ? (
            <Button
              variant="secondary"
              className="h-10 w-full"
              onClick={() => handleSkip(task.id, false)}
            >
              {translations("Undo skip")}
            </Button>
          ) : task.id === "api" && !done ? (
            // Embedded Signup runs here rather than on the channel settings page —
            // the step is "connect", so connecting is what the button does.
            <ContinueWithFacebookButton className="h-10 w-full" buttonType="login_with" />
          ) : task.group === "channels" ? (
            // Instagram and Messenger are configured in place too — the same modal
            // channel settings opens, without the trip to channel settings.
            <ConnectChannelButton
              platform={task.id === "instagram" ? "instagram" : "facebook"}
              label={btnLabel}
              variant={done ? "secondary" : "default"}
              className="h-10 w-full"
            />
          ) : (
            <Button
              variant={done ? "secondary" : "default"}
              disabled={blocked || (task.id === "verify" && isCheckingVerification)}
              className="h-10 w-full"
              onClick={() => handleAction(task.id)}
            >
              {task.id === "verify" && isCheckingVerification
                ? translations("Checking...")
                : btnLabel}
            </Button>
          )
        }
        actionFooter={
          skipped ? null : (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <Checkbox
                  id={`setup-done-${task.id}`}
                  checked={done}
                  onCheckedChange={(val) => handleToggle(task.id, val)}
                />
                <label htmlFor={`setup-done-${task.id}`} className="cursor-pointer">
                  {translations("Mark done")}
                </label>
              </span>
              {/* The three Meta steps gate sending, so only the rest can be waved off. */}
              {!done && isTaskSkippable(task) && (
                <button
                  type="button"
                  onClick={() => handleSkip(task.id, true)}
                  className="cursor-pointer text-muted-foreground underline-offset-4 hover:underline"
                >
                  {translations("Skip")}
                </button>
              )}
            </div>
          )
        }
      />
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* h-14 matches the nav panel's header, so the two bottom borders read as one
          line across the sidebar and the page. */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-heading text-[17px] font-bold tracking-[-0.02em]">
            {translations("Set up RateUp")}
          </span>
          {orgInfo?.orgName && (
            <span className="truncate text-sm text-muted-foreground">{orgInfo.orgName}</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={hideGuide}>
          {translations("Hide setup guide")}
          <IconArrowRight size={14} />
        </Button>
      </header>

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-6 pt-7 pb-14">
        <div className="mx-auto flex max-w-265 flex-col gap-6.5">
          {allDone ? (
            <div className="flex flex-wrap items-center gap-5 rounded-xl bg-ru-blue-900 p-6">
              <img src={rateupIcon} alt="" className="size-11 shrink-0 object-contain" />
              <div className="flex min-w-55 flex-1 flex-col gap-1.5">
                <span className="font-heading text-2xl font-bold tracking-[-0.02em] text-white">
                  {translations("You're live.")}
                </span>
                <span className="text-[14.5px] leading-normal text-white/70">
                  {translations(
                    "You can send and receive on WhatsApp. Every reply lands in your inbox.",
                  )}
                </span>
              </div>
              <Button size="lg" variant="secondary" onClick={hideGuide}>
                {translations("Open Inbox")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-7">
              <div className="flex min-w-[min(100%,26rem)] flex-1 flex-col gap-3">
                <h1 className="m-0 font-heading text-[28px] leading-tight font-bold tracking-[-0.025em]">
                  {orgInfo?.nameOfUser
                    ? translations("Welcome to RateUp, {name}.", {
                        name: orgInfo.nameOfUser.split(" ")[0],
                      })
                    : translations("Welcome to RateUp.")}
                </h1>
                <p className="m-0 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
                  {translations(
                    "Three steps in Meta get your number sending. Everything after that is optional — each one opens the page where you finish it.",
                  )}
                </p>
              </div>

              <div className="flex w-65 shrink-0 flex-col gap-2">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-muted-foreground">
                    {translations("{done} of {total} complete", {
                      done: doneTasks,
                      total: totalTasks,
                    })}
                  </span>
                  <span className="text-muted-foreground">
                    {translations("{mins} min left", { mins: minsLeft })}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {groups.map((group) => {
            const tasks = tasksIn(group.id);
            if (tasks.length === 0) return null;

            return (
              <section key={group.id} className="flex flex-col gap-3">
                <SectionHeading
                  title={group.title}
                  hint={group.hint}
                  badge={
                    group.required ? (
                      <Badge variant="system">{translations("Required")}</Badge>
                    ) : null
                  }
                />

                {group.required ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-input bg-muted p-3.5">
                    {tasks.map(renderTaskCard)}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">{tasks.map(renderTaskCard)}</div>
                )}
              </section>
            );
          })}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
            <span>{translations("Rather poke around first?")}</span>
            <button
              type="button"
              onClick={hideGuide}
              className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
            >
              {translations("Skip setup and explore the app")}
            </button>
            <span aria-hidden>·</span>
            {/* There is no /bookdemo route — booking is the same modal the marketing site uses. */}
            <BookDemoModal>
              <button
                type="button"
                className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
              >
                {translations("Book a 15-minute setup call")}
              </button>
            </BookDemoModal>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Meta's verification verdict, shown under the "verify" step once checked. */
function VerificationStatus({
  status,
  isChecking,
}: Readonly<{ status: string | null; isChecking: boolean }>) {
  const { t: translations } = useTranslation();

  if (isChecking) {
    return (
      <Badge variant="secondary" className="mt-0.5">
        <IconLoader2 size={12} className="animate-spin" />
        {translations("Checking...")}
      </Badge>
    );
  }

  if (status === "verified") {
    return (
      <Badge className="mt-0.5 bg-green-600/10 text-green-700 dark:text-green-500">
        <IconCircleCheck size={12} />
        {translations("Verified")}
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge className="mt-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500">
        <IconLoader2 size={12} className="animate-spin" />
        {translations("Under review")}
      </Badge>
    );
  }

  if (status === "not_verified") {
    return (
      <Badge variant="destructive" className="mt-0.5">
        <IconCircleX size={12} />
        {translations("Not verified")}
      </Badge>
    );
  }

  if (status === "ineligible") {
    return (
      <Badge variant="secondary" className="mt-0.5">
        {translations("Not eligible")}
      </Badge>
    );
  }

  return null;
}
