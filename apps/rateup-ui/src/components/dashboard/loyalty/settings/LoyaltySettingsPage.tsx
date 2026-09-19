import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconPlayerPause, IconPlayerPlay, IconRocket } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { useLoyaltyDashboardData } from "@/backend/loyalty/dashboard/dashboard.api";
import { useLoyaltyOnboardingState } from "@/backend/loyalty/onboarding.query";
import {
  useDeleteLoyaltyProgramMutation,
  useLoyaltyProgram,
  useResetLoyaltyProgramPointsMutation,
  useUpdateLoyaltyProgramMutation,
} from "@/backend/loyalty/program.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import ApiAccessKeyPage from "@/components/ExternalApi/ApiAccessKey.tsx";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { DangerZone } from "@/components/loyalty/settings/DangerZone.tsx";
import { PointsExpirationSettings } from "@/components/loyalty/settings/PointsExpirationSettings.tsx";
import { ExpirationSettingsSchema } from "@/components/loyalty/settings/schemas.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { UserRole } from "@/utils/enums/index.ts";

import { formatMoney } from "../giveback/format.ts";
import { pickJoinKeyword, pickWhatsappNumber } from "../joinLink.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { programStateOf } from "../program/programState.ts";
import { ProgramStatusBadge } from "../program/ProgramStatusBadge.tsx";
import { ChannelsField } from "./ChannelsField.tsx";
import { JoiningCard } from "./JoiningCard.tsx";

/**
 * Only what is not part of the customer promise. Name, points and typical spend are in
 * Program › Profile; every message is on Messages. What is left is how customers join, who
 * may override the programme and how it plugs in — and the two things that cannot be undone.
 */
export function LoyaltySettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const uid = useId();
  const { user } = useUser();
  const isSuperAdmin = user?.role === UserRole.SUPADM;

  const { data: program, isLoading } = useLoyaltyProgram();
  const { data: dashboard } = useLoyaltyDashboardData();
  const { data: waSettings } = useWaSettings();
  // The join QR needs the connected number and the keyword the "joining" reply listens for.
  const { data: onboardingState } = useLoyaltyOnboardingState();
  const whatsappNumber = pickWhatsappNumber(waSettings, program?.whatsappSettingsId);
  const joinKeyword = pickJoinKeyword(onboardingState?.saved.commands ?? []);
  const update = useUpdateLoyaltyProgramMutation(program?.id ?? "");
  const resetPoints = useResetLoyaltyProgramPointsMutation();
  const deleteProgram = useDeleteLoyaltyProgramMutation(() => {
    navigate({ to: LOYALTY_PATHS.overview, replace: true });
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const expirationForm = useForm<z.infer<typeof ExpirationSettingsSchema>>({
    resolver: zodResolver(ExpirationSettingsSchema),
    defaultValues: { enabled: false, months: 12 },
  });
  useEffect(() => {
    if (program && !expirationForm.formState.isDirty) {
      expirationForm.reset({
        enabled: program.enablePointsExpiration ?? false,
        months: program.pointsExpirationMonths || 12,
      });
    }
  }, [program, expirationForm]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <IconLoader2 className="size-8 animate-spin" />
      </div>
    );
  }
  if (!program) return null;

  const state = programStateOf(program);
  const pointsName = program.currencyName;
  const money = (amount: number) =>
    formatMoney(amount, program.currencyCode, program.currencySymbol);
  const outstanding = dashboard?.liability.outstandingPoints ?? 0;
  const liability = dashboard?.liability.monetaryValue ?? null;

  const setStatus = async (next: "active" | "paused") => {
    if (next === "paused") {
      const ok = await confirm({
        title: t("Pause the program?"),
        description: t(
          "Earning stops and nothing sends. Every balance is kept, and staff can still redeem rewards at the counter.",
        ),
        confirmText: t("Pause"),
      });
      if (!ok) return;
    }
    update.mutate({ status: next });
  };

  const toggle = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch);

  const onReset = async () => {
    const ok = await confirm({
      title: t("Reset every balance to zero?"),
      description: t("All {points} are removed from every member. This cannot be undone.", {
        points: pointsName,
      }),
      confirmText: t("Reset {points}", { points: pointsName }),
    });
    if (ok) resetPoints.mutate(program.id);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={t("Settings")}
        description={t(
          "Business and program names and branding are in Program › Profile, the points name under Earning; messages are on Messages. Here: the join link, approvals, integrations, expiry and the danger zone.",
        )}
      />

      {/* ── status ── */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t("Program")} <ProgramStatusBadge state={state} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[60ch] text-sm text-muted-foreground">
            {state === "live"
              ? t("On. {points} are earned on every purchase and messages send.", {
                  points: pointsName,
                })
              : state === "paused"
                ? t("Paused. Every balance is kept, earning is stopped, nothing sends.")
                : t(
                    "Not activated yet. Finish setup to start it — nothing reaches customers before that.",
                  )}
          </p>
          {state === "live" && (
            <Button
              variant="outline"
              onClick={() => setStatus("paused")}
              disabled={update.isPending}
            >
              <IconPlayerPause size={16} /> {t("Pause earning")}
            </Button>
          )}
          {state === "paused" && (
            <Button onClick={() => setStatus("active")} disabled={update.isPending}>
              <IconPlayerPlay size={16} /> {t("Resume earning")}
            </Button>
          )}
          {state === "draft" && (
            <Button render={<Link to={LOYALTY_PATHS.onboarding} />}>
              <IconRocket size={16} /> {t("Continue setup")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── joining ── */}
      <JoiningCard
        orgId={user?.orgId}
        program={program}
        whatsappNumber={whatsappNumber}
        joinKeyword={joinKeyword}
      />

      {/* ── approvals ── */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">{t("Approvals")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Field orientation="horizontal" className="rounded-lg border border-border p-3">
            <FieldContent>
              <FieldLabel htmlFor={`${uid}-auto`} className="text-sm font-medium">
                {t("Auto-approve staff adjustments")}
              </FieldLabel>
              <FieldDescription className="text-xs">
                {t(
                  "On: a correction posts at once. Off: it waits under Activity › Pending for someone to approve.",
                )}
              </FieldDescription>
            </FieldContent>
            <Switch
              id={`${uid}-auto`}
              checked={program.autoApproveAdjustments ?? false}
              onCheckedChange={(on) => toggle({ autoApproveAdjustments: on })}
              disabled={update.isPending}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── integrations ── */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">{t("Integrations")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t("WhatsApp Business")}</p>
                <p className="text-xs text-muted-foreground">
                  {waSettings?.length
                    ? t("Connected. Pick which number the program sends from.")
                    : t("Not connected — notifications will not send.")}
                </p>
              </div>
              <Button variant="ghost" size="sm" render={<Link to="/dashboard/settings/channels" />}>
                {waSettings?.length ? t("Manage channels") : t("Connect")}
              </Button>
            </div>
            {Boolean(waSettings?.length) && (
              <div className="mt-3 max-w-sm">
                <AccountSelector
                  value={program.whatsappSettingsId ?? undefined}
                  onChange={(value) =>
                    value &&
                    value !== program.whatsappSettingsId &&
                    toggle({ whatsappSettingsId: value })
                  }
                />
              </div>
            )}
          </div>

          <Field orientation="horizontal" className="rounded-lg border border-border p-3">
            <FieldContent>
              <FieldLabel htmlFor={`${uid}-wa`} className="text-sm font-medium">
                {t("Send WhatsApp notifications")}
              </FieldLabel>
              <FieldDescription className="text-xs">
                {t("The master switch. Which messages send is decided on Messages.")}
              </FieldDescription>
            </FieldContent>
            <Switch
              id={`${uid}-wa`}
              checked={program.whatsappNotifications ?? true}
              onCheckedChange={(on) => toggle({ whatsappNotifications: on })}
              disabled={update.isPending}
            />
          </Field>

          <Field orientation="horizontal" className="rounded-lg border border-border p-3">
            <FieldContent>
              <FieldLabel htmlFor={`${uid}-text`} className="text-sm font-medium">
                {t("Send as a plain message inside the 24-hour window")}
              </FieldLabel>
              <FieldDescription className="text-xs">
                {t(
                  "When a customer has messaged you in the last 24 hours, the message is sent as a normal chat message — free, and it works before Meta approves the template, or with no template at all. Templates with buttons are always sent as templates.",
                )}
              </FieldDescription>
            </FieldContent>
            <Switch
              id={`${uid}-text`}
              checked={program.sendTextInSession ?? true}
              onCheckedChange={(on) => toggle({ sendTextInSession: on })}
              disabled={update.isPending}
            />
          </Field>

          <ChannelsField
            available={program.availableChannels ?? []}
            enabled={program.enabledChannels ?? ["WHATSAPP"]}
            disabled={update.isPending}
            onChange={(enabledChannels) => toggle({ enabledChannels })}
          />

          <Field orientation="horizontal" className="rounded-lg border border-border p-3">
            <FieldContent>
              <FieldLabel htmlFor={`${uid}-email`} className="text-sm font-medium">
                {t("Email notifications")}
              </FieldLabel>
              <FieldDescription className="text-xs">
                {t("Program notices by email.")}
              </FieldDescription>
            </FieldContent>
            <Switch
              id={`${uid}-email`}
              checked={program.emailNotifications ?? true}
              onCheckedChange={(on) => toggle({ emailNotifications: on })}
              disabled={update.isPending}
            />
          </Field>

          <Field orientation="horizontal" className="rounded-lg border border-border p-3">
            <FieldContent>
              <FieldLabel htmlFor={`${uid}-shopify`} className="text-sm font-medium">
                {t("Shopify orders earn {points}", { points: pointsName })}
              </FieldLabel>
              <FieldDescription className="text-xs">
                {t("Online orders follow the same earning rules as the counter.")}
              </FieldDescription>
            </FieldContent>
            <Switch
              id={`${uid}-shopify`}
              checked={program.enableShopifyOrderPoints ?? false}
              onCheckedChange={(on) => toggle({ enableShopifyOrderPoints: on })}
              disabled={update.isPending}
            />
          </Field>

          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">{t("POS and API access")}</p>
            <p className="mb-3 text-xs text-muted-foreground">
              {t("For a till or ordering system that awards {points} directly.", {
                points: pointsName,
              })}
            </p>
            <ApiAccessKeyPage />
          </div>
        </CardContent>
      </Card>

      {/* ── expiry ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <PointsExpirationSettings form={expirationForm} programId={program.id} />
          {outstanding > 0 && (
            <p className="text-xs text-muted-foreground">
              {liability !== null
                ? t(
                    "{points} {name} are currently unspent — worth {value} if every one is redeemed.",
                    {
                      points: outstanding.toLocaleString(),
                      name: pointsName,
                      value: money(liability),
                    },
                  )
                : t("{points} {name} are currently unspent.", {
                    points: outstanding.toLocaleString(),
                    name: pointsName,
                  })}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <DangerZone
            onReset={onReset}
            onDelete={() => {
              setDeleteText("");
              setDeleteOpen(true);
            }}
            showDelete={isSuperAdmin}
          />
          <p className="text-xs text-muted-foreground">
            {t(
              "Pausing keeps every balance intact and simply stops earning. These two cannot be undone.",
            )}
          </p>
        </div>
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteOpen(false);
            setDeleteText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("Delete the program")}</DialogTitle>
            <DialogDescription>
              {t("This is permanent. Every member, balance, rule and reward is removed.")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <p className="text-sm text-muted-foreground">
              {t("Type")} <span className="font-semibold text-foreground">“{program.name}”</span>{" "}
              {t("to confirm")}
            </p>
            <Input
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
              placeholder={program.name}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteText !== program.name || deleteProgram.isPending}
              onClick={() => {
                deleteProgram.mutate({ programId: program.id, force: true });
                setDeleteOpen(false);
              }}
            >
              {deleteProgram.isPending && <IconLoader2 className="size-4 animate-spin" />}
              {t("Delete program")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
