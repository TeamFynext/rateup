// Extracted verbatim from `InstagramDashboard.tsx`. Behaviour is unchanged.

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

export function CommentsTab() {
  const { data: rules = [] } = useRules();
  const updateMutation = useUpdateRuleMutation();
  const deleteMutation = useDeleteRuleMutation();
  const { t } = useTranslation();

  const commentRules = useMemo(
    () => rules.filter((r) => r.platform === "INSTAGRAM" && r.triggerEvent === "INSTAGRAM_COMMENT"),
    [rules],
  );

  return (
    <Card className="bg-ru-n-25 dark:bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950">
            <IconMessageDots className="size-4.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Comment Automations")}</CardTitle>
            <CardDescription>
              {t("Automatically send private replies when someone comments on your posts.")}
            </CardDescription>
          </div>
          <Button
            size="sm"
            render={
              <Link
                to="/dashboard/automation/$automationId"
                params={{ automationId: "new" }}
                search={{ platform: "INSTAGRAM", triggerEvent: "INSTAGRAM_COMMENT" }}
              />
            }
          >
            <IconPlus className="mr-1.5 size-4" />
            {t("Create")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {commentRules.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconMessageDots className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{t("No comment automations")}</EmptyTitle>
              <EmptyDescription>
                {t('Create an automation with the "Instagram Comment" trigger to get started.')}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                size="sm"
                render={
                  <Link
                    to="/dashboard/automation/$automationId"
                    params={{ automationId: "new" }}
                    search={{ platform: "INSTAGRAM", triggerEvent: "INSTAGRAM_COMMENT" }}
                  />
                }
              >
                <IconPlus className="mr-1.5 size-4" />
                {t("Create automation")}
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {commentRules.length > 0 && (
          <CardGrid
            items={commentRules}
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
