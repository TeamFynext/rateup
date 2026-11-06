// Extracted verbatim from the `/dashboard/automation/rules/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconChevronDown, IconFilter, IconGrid3x3, IconList, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useDeleteRuleMutation,
  useRules,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { CardView } from "@/components/dashboard/automation/components/card-view.tsx";
import { TemplateGallery } from "@/components/dashboard/automation/components/wizard/TemplateGallery.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import type { Rule } from "@/types/rule.ts";

const AUTOMATION_SORT_OPTIONS = [
  { value: "latest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "a-z", label: "Name (A-Z)" },
  { value: "z-a", label: "Name (Z-A)" },
] as const;

export function AutomationPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "a-z" | "z-a">("latest");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const { data = [], isLoading, isError, refetch } = useRules();
  const deleteMutation = useDeleteRuleMutation();
  const updateMutation = useUpdateRuleMutation();
  const navigate = useNavigate();

  const filteredData = data
    .filter((item) => {
      if (filterActive === "active") return item.isActive;
      if (filterActive === "inactive") return !item.isActive;
      return true;
    })
    .filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "a-z") return a.name.localeCompare(b.name);
      if (sortBy === "z-a") return b.name.localeCompare(a.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleCreate = () => {
    navigate({
      to: "/dashboard/automation/rules/$ruleId",
      params: { ruleId: "new" },
    });
  };

  const handleToggleActive = (rule: Rule) => {
    updateMutation.mutate({ ...rule, isActive: !rule.isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const isEmpty = !isLoading && !isError && filteredData.length === 0;
  const hasNoRules = !isLoading && !isError && data.length === 0;

  return (
    <ListPage>
      <ListPageHeader>
        <ListPageHeaderSection className="gap-3">
          <Button onClick={handleCreate} loading={isLoading}>
            {t("Create rule")}
            <IconPlus size={16} className="ml-2" />
          </Button>
          <RefreshButton queryKeys={["rules"]} />
        </ListPageHeaderSection>

        <ListPageHeaderSection>
          <ListPageSearchInput
            placeholder={t("Search rules...")}
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    loading={isLoading}
                  />
                }
              >
                <IconFilter className="w-3.5 h-3.5" />
                Filter
                <IconChevronDown className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-sm">
                <DropdownMenuItem
                  onClick={() => setFilterActive("all")}
                  className={filterActive === "all" ? "bg-accent" : ""}
                >
                  All
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilterActive("active")}
                  className={filterActive === "active" ? "bg-accent" : ""}
                >
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilterActive("inactive")}
                  className={filterActive === "inactive" ? "bg-accent" : ""}
                >
                  Inactive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <div className="flex gap-1 bg-muted p-1 rounded">
              <Button
                onClick={() => setViewMode("grid")}
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="gap-2"
                loading={isLoading}
              >
                <IconGrid3x3 className="w-4 h-4" />
                Grid
              </Button>
              <Button
                onClick={() => setViewMode("list")}
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="gap-2"
                loading={isLoading}
              >
                <IconList className="w-4 h-4" />
                List
              </Button>
            </div>
          </div>
          <ListPageSortDropdown
            value={sortBy}
            onChange={(value) => setSortBy(value as "latest" | "oldest" | "a-z" | "z-a")}
            options={AUTOMATION_SORT_OPTIONS}
          />
        </ListPageHeaderSection>
      </ListPageHeader>
      {hasNoRules ? (
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold">Start with a template</h2>
            <p className="text-muted-foreground text-sm">
              Each one sets up the trigger and actions for you. You pick the team, label or message.
            </p>
          </div>
          <TemplateGallery
            limit={4}
            onPick={(template) =>
              navigate({
                to: "/dashboard/automation/rules/$ruleId",
                params: { ruleId: "new" },
                search: { template: template.id },
              })
            }
          />
          <div>
            <Button variant="link" className="px-0" onClick={handleCreate}>
              See all templates, or start from scratch
            </Button>
          </div>
        </section>
      ) : (
        <ListPageContent
          isLoading={isLoading}
          isError={isError}
          isEmpty={isEmpty}
          emptyTitle={t("No rules yet")}
          emptyDescription={t(
            "Create your first rule to reply, tag or assign automatically when something happens.",
          )}
          onRetry={refetch}
        >
          <CardView
            data={filteredData}
            viewMode={viewMode}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
          />
        </ListPageContent>
      )}
    </ListPage>
  );
}
