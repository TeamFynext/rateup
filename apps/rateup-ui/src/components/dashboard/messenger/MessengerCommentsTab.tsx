import { IconMessageDots, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useDeleteRuleMutation,
  useRules,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import { CardGrid } from "@/components/common/generic-card.tsx";
import { RuleCard } from "@/components/dashboard/automation/components/rule-card.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";

/** "Facebook Page Comment" rules for one Page; mirrors Instagram's Comments tab. */
export function MessengerCommentsTab({ pageId }: Readonly<{ pageId: string }>) {
  const { data: rules = [] } = useRules();
  const updateMutation = useUpdateRuleMutation();
  const deleteMutation = useDeleteRuleMutation();
  const { t } = useTranslation();

  const commentRules = useMemo(
    () =>
      rules.filter(
        (r) =>
          r.platform === "FACEBOOK" &&
          r.triggerEvent === "FACEBOOK_COMMENT" &&
          r.whatsappSettingsPhoneIds?.includes(pageId),
      ),
    [rules, pageId],
  );

  const createButton = (label: string) => (
    <Button
      size="sm"
      render={
        <Link
          to="/dashboard/automation/rules/$ruleId"
          params={{ ruleId: "new" }}
          search={{ platform: "FACEBOOK", triggerEvent: "FACEBOOK_COMMENT", channel: pageId }}
        />
      }
    >
      <IconPlus className="mr-1.5 size-4" />
      {label}
    </Button>
  );

  return (
    <Card className="bg-ru-n-25 dark:bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
            <IconMessageDots className="size-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Comment Automations")}</CardTitle>
            <CardDescription>
              {t("Reply privately in Messenger when someone comments on your Page's posts.")}
            </CardDescription>
          </div>
          {createButton(t("Create"))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {commentRules.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconMessageDots className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{t("No comment automations")}</EmptyTitle>
              <EmptyDescription>
                {t('Create an automation with the "Facebook Page Comment" trigger to get started.')}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>{createButton(t("Create rule"))}</EmptyContent>
          </Empty>
        ) : (
          <CardGrid
            items={commentRules}
            getKey={(item) => item.id}
            renderItem={(item) => (
              <Link to="/dashboard/automation/rules/$ruleId" params={{ ruleId: item.id }}>
                <RuleCard
                  item={item}
                  onToggleActive={() =>
                    updateMutation.mutate({ ...item, isActive: !item.isActive })
                  }
                  onDelete={(event) => {
                    event.preventDefault();
                    deleteMutation.mutate(item.id);
                  }}
                />
              </Link>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
