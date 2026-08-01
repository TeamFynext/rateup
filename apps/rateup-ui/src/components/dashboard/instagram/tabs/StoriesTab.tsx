// Extracted verbatim from `InstagramDashboard.tsx`. Behaviour is unchanged.

import { IconPlus, IconHistory } from "@tabler/icons-react";
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

export function StoriesTab() {
  const { data: rules = [] } = useRules();
  const updateMutation = useUpdateRuleMutation();
  const deleteMutation = useDeleteRuleMutation();
  const { t } = useTranslation();

  const storyMentionRules = useMemo(
    () =>
      rules.filter(
        (r) => r.platform === "INSTAGRAM" && r.triggerEvent === "INSTAGRAM_STORY_MENTION",
      ),
    [rules],
  );

  return (
    <Card className="bg-ink-25 dark:bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
            <IconHistory className="size-4.5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Story Mention Automations")}</CardTitle>
            <CardDescription>
              {t("Triggered when someone mentions your account in their Instagram story.")}
            </CardDescription>
          </div>
          <Button
            size="sm"
            render={
              <Link
                to="/dashboard/automation/$automationId"
                params={{ automationId: "new" }}
                search={{ platform: "INSTAGRAM", triggerEvent: "INSTAGRAM_STORY_MENTION" }}
              />
            }
          >
            <IconPlus className="mr-1.5 size-4" />
            {t("Create")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {storyMentionRules.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconHistory className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{t("No story mention automations")}</EmptyTitle>
              <EmptyDescription>
                {t(
                  'Create an automation with the "Instagram Story Mention" trigger to get started.',
                )}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                size="sm"
                render={
                  <Link
                    to="/dashboard/automation/$automationId"
                    params={{ automationId: "new" }}
                    search={{ platform: "INSTAGRAM", triggerEvent: "INSTAGRAM_STORY_MENTION" }}
                  />
                }
              >
                <IconPlus className="mr-1.5 size-4" />
                {t("Create automation")}
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {storyMentionRules.length > 0 && (
          <CardGrid
            items={storyMentionRules}
            getKey={(item) => item.id}
            renderItem={(item) => (
              <Link to="/dashboard/automation/$automationId" params={{ automationId: item.id }}>
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
