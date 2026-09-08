import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useCreateCampaignMutation } from "@/backend/campaign/campaign.query";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils";
import { CampaignStatus, CampaignType } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import type { CampaignWizardStepProps } from "./step.types.ts";

const basicsSchema = z.object({
  name: z.string().trim().min(1, { error: "Give the campaign a name" }),
  teamId: z.string().min(1, { error: "Choose a team" }),
  type: z.enum(CampaignType),
});

export type BasicsValues = z.infer<typeof basicsSchema>;

interface BasicsFormProps {
  defaults: BasicsValues;
  /** Set on create so the campaign starts as a resumable draft. */
  status?: CampaignStatus;
  onCreated?: (campaignId: string) => void;
  onSave?: (values: BasicsValues) => Promise<void>;
  registerSubmit?: (submit: () => void | Promise<void>) => void;
  /** The type is fixed once the campaign exists; changing it invalidates the template. */
  lockType?: boolean;
  /**
   * Reported upward so `/campaign/new` can title the page and drop the Retries
   * step from its rail — a drip campaign's cadence is the drip cron's, not a
   * retry policy's.
   */
  onTypeChange?: (type: CampaignType) => void;
  /** Lets the shell's Next button show the create as in flight. */
  onPendingChange?: (pending: boolean) => void;
}

/**
 * Name, team and campaign type.
 *
 * The only step that blocks progress on its own — everything after it is either
 * optional or enforced at launch. Used both by `/new` (where submitting creates
 * the draft) and by the wizard's own first step.
 */
export function BasicsForm({
  defaults,
  status,
  onCreated,
  onSave,
  registerSubmit,
  lockType = false,
  onTypeChange,
  onPendingChange,
}: Readonly<BasicsFormProps>) {
  const { t } = useTranslation("campaign.wizard");
  const form = useForm<BasicsValues>({
    resolver: zodResolver(basicsSchema),
    mode: "onChange",
    defaultValues: defaults,
  });

  const teamId = form.watch("teamId");
  const type = form.watch("type");
  // Silent: creating the campaign is pressing Next on step 1. The wizard's header
  // says it saved, and a toast here lands on top of the Next button.
  const createMutation = useCreateCampaignMutation(teamId, type, { silent: true });

  const submit = form.handleSubmit(async (values) => {
    if (onSave) {
      await onSave(values);
      return;
    }
    try {
      const created = await createMutation.mutateAsync({ ...values, status });
      const campaignId: unknown = created?.data?.id;
      if (typeof campaignId === "string") onCreated?.(campaignId);
    } catch (error) {
      form.setError("name", {
        message: getApiErrorMessage(error, "Could not create the campaign"),
      });
    }
  });

  useEffect(() => {
    registerSubmit?.(submit);
  }, [registerSubmit, submit]);

  useEffect(() => {
    onPendingChange?.(createMutation.isPending);
  }, [onPendingChange, createMutation.isPending]);

  return (
    <form
      className="flex w-160 flex-col gap-7"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t("Let's start with the basics")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("You can change everything else later.")}
        </p>
      </header>

      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel htmlFor="campaign-name">{t("Campaign name")}</FieldLabel>
            <Input id="campaign-name" {...field} placeholder={t("Diwali early access")} />
            <FieldDescription>{t("Internal only — recipients never see this.")}</FieldDescription>
            <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="teamId"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>{t("Team")}</FieldLabel>
            <TeamSelector value={field.value} onChange={(value) => field.onChange(value ?? "")} />
            <FieldDescription>{t("Controls who can edit and see results.")}</FieldDescription>
            <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <Field>
            <FieldLabel>{t("Campaign type")}</FieldLabel>
            <div className="grid grid-cols-2 gap-3.5">
              <TypeCard
                selected={field.value === CampaignType.WHATSAPP}
                disabled={lockType && field.value !== CampaignType.WHATSAPP}
                title={t("Broadcast")}
                description={t("One template to everyone, once.")}
                onSelect={() => {
                  field.onChange(CampaignType.WHATSAPP);
                  onTypeChange?.(CampaignType.WHATSAPP);
                }}
                illustration={<BroadcastShape />}
              />
              <TypeCard
                selected={field.value === CampaignType.DRIP}
                disabled={lockType && field.value !== CampaignType.DRIP}
                title={t("Drip")}
                description={t("A sequence of messages spread over days.")}
                onSelect={() => {
                  field.onChange(CampaignType.DRIP);
                  onTypeChange?.(CampaignType.DRIP);
                }}
                illustration={<DripShape />}
              />
            </div>
            {lockType ? (
              <FieldDescription>
                {t("The type is fixed once a campaign exists — create a new one to change it.")}
              </FieldDescription>
            ) : null}
          </Field>
        )}
      />
    </form>
  );
}

function TypeCard({
  selected,
  disabled,
  title,
  description,
  illustration,
  onSelect,
}: Readonly<{
  selected: boolean;
  disabled: boolean;
  title: string;
  description: string;
  illustration: React.ReactNode;
  onSelect: () => void;
}>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl p-4.5 pb-4 text-left shadow-xs ring-1 transition",
        selected ? "ring-primary ring-2" : "ring-foreground/10",
        disabled ? "cursor-not-allowed opacity-50" : "hover:shadow-md cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[15px] font-semibold">{title}</span>
          <span className="text-muted-foreground text-[12.5px] leading-relaxed">{description}</span>
        </div>
        <span
          className={cn(
            "mt-0.5 size-4.5 shrink-0 rounded-full border",
            selected ? "border-primary border-[5px]" : "border-input border-[1.5px]",
          )}
          aria-hidden
        />
      </div>
      {/* Shows the sending shape rather than describing it — one burst against a
          decaying sequence is the whole difference between the two types. */}
      <div className="bg-muted relative flex h-14 items-end overflow-hidden rounded-lg px-4 pb-3">
        <span className="bg-input absolute inset-x-4 top-7 h-px" aria-hidden />
        {illustration}
        <span className="text-muted-foreground/70 absolute bottom-1 left-4 text-[9px]">Day 1</span>
        <span className="text-muted-foreground/70 absolute right-4 bottom-1 text-[9px]">Day 7</span>
      </div>
    </button>
  );
}

/** One burst on day one: five bars rising and falling in place. */
function BroadcastShape() {
  return (
    <span className="absolute bottom-3 left-8 flex items-end gap-0.5" aria-hidden>
      {[14, 20, 26, 20, 14].map((height, index) => (
        <span
          key={index}
          className="bg-primary w-1.5 rounded-sm"
          style={{ height: `${height}px` }}
        />
      ))}
    </span>
  );
}

/** Three sends fading across the week. */
function DripShape() {
  return (
    <>
      <span
        className="bg-primary absolute bottom-3.5 left-8 w-[7px] rounded-sm"
        style={{ height: "22px" }}
        aria-hidden
      />
      <span
        className="bg-ru-blue-500 absolute bottom-3.5 left-1/2 w-[7px] rounded-sm"
        style={{ height: "16px" }}
        aria-hidden
      />
      <span
        className="bg-ru-blue-300 absolute right-8 bottom-3.5 w-[7px] rounded-sm"
        style={{ height: "12px" }}
        aria-hidden
      />
    </>
  );
}

/** The wizard's own first step: the same form, saving into the existing draft. */
export function BasicsStep({ wizard, registerSubmit }: Readonly<CampaignWizardStepProps>) {
  const { campaign } = wizard;
  return (
    <div className="flex justify-center px-8 pt-12 pb-8">
      <BasicsForm
        defaults={{
          name: campaign?.name ?? "",
          teamId: campaign?.teamId ?? "",
          type: (campaign?.type as CampaignType) ?? CampaignType.WHATSAPP,
        }}
        lockType
        registerSubmit={registerSubmit}
        onSave={async (values) => {
          await wizard.saveAndContinue({ name: values.name });
        }}
      />
    </div>
  );
}
