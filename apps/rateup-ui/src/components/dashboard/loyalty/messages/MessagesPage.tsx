import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import { useLoyaltyRewards } from "@/backend/loyalty/reward.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { TemplateType } from "@/types/enums.ts";

import { CreateTemplateFromExampleDialog } from "./CreateTemplateFromExampleDialog.tsx";
import { EventTriggerRow } from "./EventTriggerRow.tsx";
import { JoinMessageCard } from "./JoinMessageCard.tsx";
import { KeywordRepliesSection } from "./KeywordRepliesSection.tsx";
import { loyaltyEventCatalog, type LoyaltyEventDefinition } from "./loyaltyEventCatalog.ts";
import { RegistrationLinkCard } from "./RegistrationLinkCard.tsx";
import { useEventTriggerEditor } from "./useEventTriggerEditor.ts";

export type MessagesSection = "registration" | "keywords" | "notifications" | "reminders";

/**
 * Everything the programme says on WhatsApp, in one place: the join link, the keyword
 * replies, the notifications a transaction fires, and the scheduled reminders — each
 * beside the Meta template it sends and that template's approval state.
 */
export function MessagesPage({ section }: Readonly<{ section?: MessagesSection }>) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: program } = useLoyaltyProgram();
  const { data: templates = [] } = useWaTemplates(TemplateType.LOYALTY);
  const { data: rewards = [] } = useLoyaltyRewards();
  const editor = useEventTriggerEditor(program?.id);
  const [creating, setCreating] = useState<LoyaltyEventDefinition | null>(null);
  const catalog = useMemo(() => loyaltyEventCatalog(t), [t]);

  // `?section=` lands the reader on the part they came for.
  const refs = useRef<Partial<Record<MessagesSection, HTMLElement | null>>>({});
  useEffect(() => {
    if (section) refs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);

  const gifts = rewards.filter(
    (reward) => reward.rewardType === "assigned" && reward.status === "ACTIVE",
  );
  const row = (definition: LoyaltyEventDefinition, extra?: React.ReactNode) => {
    const trigger = editor.byEvent.get(definition.eventType);
    const saving = editor.isSaving && editor.savingEvent === definition.eventType;
    return (
      <EventTriggerRow
        key={definition.eventType}
        definition={definition}
        trigger={trigger}
        templates={templates}
        isSaving={saving}
        onToggle={(enabled) =>
          editor.save.mutate({ eventType: definition.eventType, patch: { enabled } })
        }
        onTemplateChange={(waTemplateId) =>
          editor.save.mutate({
            eventType: definition.eventType,
            patch: { waTemplateId: waTemplateId ?? undefined },
          })
        }
        onCreateFromExample={() => setCreating(definition)}
        extra={extra}
      />
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title={t("Messages")}
        description={t("Keyword replies, notifications and reminders")}
      />

      <section
        ref={(el) => {
          refs.current.registration = el;
        }}
        className="flex flex-col gap-3"
      >
        <RegistrationLinkCard orgId={user?.orgId} />
        {program && <JoinMessageCard program={program} />}
      </section>

      <section
        ref={(el) => {
          refs.current.keywords = el;
        }}
      >
        <KeywordRepliesSection />
      </section>

      <section
        ref={(el) => {
          refs.current.notifications = el;
        }}
        className="flex flex-col gap-3"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("Automated notifications")}</h2>
          <p className="text-xs text-muted-foreground">
            {t(
              "Sent by a transaction. Meta approves each template before it can send; that usually takes a few hours.",
            )}
          </p>
        </div>
        {catalog.filter((d) => d.group === "notification").map((d) => row(d))}
      </section>

      <section
        ref={(el) => {
          refs.current.reminders = el;
        }}
        className="flex flex-col gap-3"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("Reminders")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("Scheduled nudges. Each one uses an approved template.")}
          </p>
        </div>
        {catalog
          .filter((d) => d.group === "reminder")
          .map((definition) => {
            const trigger = editor.byEvent.get(definition.eventType);
            if (definition.eventType === "INACTIVITY_REMINDER") {
              return row(
                definition,
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  {t("After")}
                  <Input
                    type="number"
                    min={1}
                    className="h-9 w-20"
                    defaultValue={trigger?.triggerDays ?? 30}
                    onBlur={(event) => {
                      const days = Number(event.target.value);
                      if (days > 0 && days !== trigger?.triggerDays) {
                        editor.save.mutate({
                          eventType: definition.eventType,
                          patch: { triggerDays: days },
                        });
                      }
                    }}
                  />
                  {t("quiet days")}
                </label>,
              );
            }
            if (definition.eventType === "BIRTHDAY") {
              return row(
                definition,
                <div className="min-w-48">
                  <p className="mb-1 text-xs text-muted-foreground">{t("Gift")}</p>
                  <Select
                    value={trigger?.rewardId ?? null}
                    items={gifts.map((gift) => ({ value: gift.id, label: gift.name }))}
                    onValueChange={(value) =>
                      editor.save.mutate({
                        eventType: definition.eventType,
                        patch: { rewardId: value ?? undefined },
                      })
                    }
                    disabled={gifts.length === 0}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue
                        placeholder={gifts.length === 0 ? t("No free gifts yet") : t("Pick a gift")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {gifts.map((gift) => (
                        <SelectItem key={gift.id} value={gift.id}>
                          {gift.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>,
              );
            }
            return row(definition);
          })}
      </section>

      <CreateTemplateFromExampleDialog
        definition={creating}
        onClose={() => setCreating(null)}
        onCreated={(templateId) => {
          if (creating)
            editor.save.mutate({
              eventType: creating.eventType,
              patch: { waTemplateId: templateId },
            });
        }}
      />
    </div>
  );
}
