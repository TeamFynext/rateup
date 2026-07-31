// Extracted verbatim from the `/dashboard/automation/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Filter, Grid3x3, List } from "lucide-react";
import { useState } from "react";

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
      to: "/dashboard/automation/$automationId",
      params: { automationId: "new" },
    });
  };

  const handleToggleActive = (rule: Rule) => {
    updateMutation.mutate({ ...rule, isActive: !rule.isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const isEmpty = !isLoading && !isError && filteredData.length === 0;

  return (
    <ListPage>
      <ListPageHeader>
        <ListPageHeaderSection className="gap-3">
          <Button onClick={handleCreate} disabled={isLoading}>
            Create Automation
            <IconPlus size={16} className="ml-2" />
          </Button>
          <RefreshButton queryKeys={["rules"]} />
        </ListPageHeaderSection>

        <ListPageHeaderSection>
          <ListPageSearchInput
            placeholder="Search..."
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
                    disabled={isLoading}
                  />
                }
              >
                <Filter className="w-3.5 h-3.5" />
                Filter
                <ChevronDown className="w-3.5 h-3.5" />
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
                disabled={isLoading}
              >
                <Grid3x3 className="w-4 h-4" />
                Grid
              </Button>
              <Button
                onClick={() => setViewMode("list")}
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="gap-2"
                disabled={isLoading}
              >
                <List className="w-4 h-4" />
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
      <ListPageContent
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        emptyTitle="No Automation Yet"
        emptyDescription="You haven't created any automation yet. Get started by creating your first automation."
        onRetry={refetch}
      >
        <CardView
          data={filteredData}
          viewMode={viewMode}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      </ListPageContent>
    </ListPage>
  );
}
