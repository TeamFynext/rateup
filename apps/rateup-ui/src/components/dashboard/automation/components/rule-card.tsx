import { IconDots, IconTrash } from "@tabler/icons-react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { useShopifyAttribution } from "@/backend/appsIntegration/shopify/shopify.query";
import { ActionCard } from "@/components/common/action-card.tsx";
import { formatRevenue } from "@/components/shopify/ShopifyResults.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { ShopifyEvents } from "@/types/enums.ts";
import type { Rule } from "@/types/rule.ts";

import { getTriggerEventLabel } from "./schema.ts";

/**
 * "₹12,400 from 9 orders · 30 days" under an abandoned-checkout rule. Every card reads the
 * same cached report, so a page of rules makes one request; without access to it, nothing
 * shows.
 */
function RecoveredRevenue({ ruleId }: Readonly<{ ruleId: string }>) {
  const { t } = useTranslation();
  const { data } = useShopifyAttribution(30);
  const row = data?.byRule.find((rule) => rule.ruleId === ruleId);
  if (!row?.sent) return null;
  const revenue = formatRevenue(row.revenue);
  return (
    <p className="text-xs text-muted-foreground">
      {revenue
        ? t("{revenue} from {count, plural, one {# order} other {# orders}} · 30 days", {
            revenue,
            count: row.recovered,
          })
        : t("{count, plural, one {# reminder} other {# reminders}} sent · 30 days", {
            count: row.sent,
          })}
    </p>
  );
}

interface RuleCardProps {
  item: Rule;
  onToggleActive: (isActive: boolean) => void;
  onDelete: (e: MouseEvent<HTMLElement>) => void;
}

export function RuleCard({ item, onToggleActive, onDelete }: Readonly<RuleCardProps>) {
  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="More actions"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          />
        }
      >
        <IconDots size={20} />
      </DropdownMenuTrigger>
      {/* Same as the campaign card: the popup inherits the icon button's width unless told
          otherwise, which wraps the labels. */}
      <DropdownMenuContent
        align="end"
        className="w-auto min-w-40"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(event);
          }}
          className="text-destructive"
        >
          <IconTrash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ActionCard
      title={item.name}
      titleTooltip={item.name}
      subtitle={getTriggerEventLabel(item.triggerEvent)}
      actions={menu}
      content={
        <div className="flex flex-col gap-2">
          {item.triggerEvent === "SHOPIFY_EVENT" &&
            item.options?.shopifyEvent === ShopifyEvents.ABANDONED_CHECKOUTS && (
              <RecoveredRevenue ruleId={item.id} />
            )}
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className={
                item.platform === "WHATSAPP"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
                  : item.platform === "INSTAGRAM"
                    ? "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200"
                    : "bg-ru-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
              }
            >
              {item.platform}
            </Badge>
            {/* Stopped on the wrapper, not the switch: Base UI renders the hidden input as a
              sibling of the switch and re-dispatches a bubbling click on it, so the card's
              onClick fired and navigated into the rule. */}
            <span className="inline-flex" onClick={(event) => event.stopPropagation()}>
              <Switch
                checked={item.isActive}
                onCheckedChange={() => {
                  onToggleActive(!item.isActive);
                }}
              />
            </span>
          </div>
        </div>
      }
      footerLeft={
        <Badge
          variant="secondary"
          className={
            item.isActive
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
              : "bg-muted text-foreground"
          }
        >
          {item.isActive ? "Active" : "Inactive"}
        </Badge>
      }
      createdAt={item.createdAt}
    />
  );
}
