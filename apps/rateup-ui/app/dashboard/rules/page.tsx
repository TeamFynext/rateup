"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Rule } from "@/types/rule";
import {
  useDeleteRuleMutation,
  useRules,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import { ToolBar } from "@/components/common/tool-bar";

import { CardView } from "./components/card-view";
import Skeletons from "./components/skeletons";

export default function Home() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "status">("date");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");
  const { data = [], isLoading } = useRules();
  const deleteMutation = useDeleteRuleMutation();
  const updateMutation = useUpdateRuleMutation();
  const router = useRouter();

  const filteredData = data
    .filter((item) => {
      if (filterActive === "active") return item.isActive;
      if (filterActive === "inactive") return !item.isActive;
      return true;
    })
    .filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "status")
        return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleCreate = () => {
    // Navigate to create rule page
    router.push("/dashboard/rules/new");
  };

  const handleToggleActive = (rule: Rule) => {
    updateMutation.mutate({ ...rule, isActive: !rule.isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <main className="container space-y-4">
      <ToolBar
        title="Rules"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterActive={filterActive}
        onFilterChange={setFilterActive}
        onCreate={handleCreate}
        isLoading={isLoading}
      />

      {isLoading ? (
        <Skeletons viewMode={viewMode} />
      ) : (
        <CardView
          data={filteredData}
          viewMode={viewMode}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
