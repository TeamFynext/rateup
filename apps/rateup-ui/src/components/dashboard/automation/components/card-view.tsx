import { IconTrash } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { CardGrid } from "@/components/common/generic-card.tsx";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import type { Rule } from "@/types/rule.ts";

import { RuleCard } from "./rule-card.tsx";

interface CardViewProps {
  data: Rule[];
  viewMode: "grid" | "list";
  onToggleActive: (item: Rule) => void;
  onDelete: (id: string) => void;
}

export function CardView({ data, viewMode, onToggleActive, onDelete }: Readonly<CardViewProps>) {
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const handleDelete = async (id: string) => {
    const shouldDelete = await confirm({
      title: translations("Delete Rule"),
      description: translations("Are you sure you want to delete this Rule?"),
      confirmText: translations("Delete"),
    });

    if (!shouldDelete) return;

    onDelete(id);
  };

  const columns = useMemo<ColumnDef<Rule>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.triggerEvent}</span>
          </div>
        ),
      },
      {
        accessorKey: "operator",
        header: "Operator",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs py-0.5 px-2">
            {row.original.operator}
          </Badge>
        ),
      },
      {
        accessorFn: (row) => row.groups[0]?.conditions?.length || 0,
        id: "conditions",
        header: "Conditions",
        cell: ({ row }) => (
          <span className="text-sm font-semibold">
            {row.original.groups[0]?.conditions?.length || 0}
          </span>
        ),
      },
      {
        accessorFn: (row) => row.actions?.length || 0,
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <span className="text-sm font-semibold">{row.original.actions?.length || 0}</span>
        ),
      },
      {
        accessorFn: (row) => row.isActive,
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.original.isActive}
              onCheckedChange={() => {
                onToggleActive(row.original);
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleActive(row.original);
              }}
            />
            <span className="text-xs text-muted-foreground">
              {row.original.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "row-actions",
        header: "",
        cell: ({ row }) => (
          <Button
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleDelete(row.original.id);
            }}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <IconTrash className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onToggleActive, handleDelete],
  );

  return (
    <>
      {viewMode === "grid" ? (
        <CardGrid
          items={data}
          getKey={(item) => item.id}
          renderItem={(item) => (
            <Link to="/dashboard/automation/$automationId" params={{ automationId: item.id }}>
              <RuleCard
                item={item}
                onToggleActive={() => {
                  onToggleActive(item);
                }}
                onDelete={(event) => {
                  event.preventDefault();
                  handleDelete(item.id);
                }}
              />
            </Link>
          )}
        />
      ) : (
        <DataTable
          data={data}
          columns={columns}
          onRowClick={(row) => {
            navigate({
              to: `/dashboard/automation/${row.id}`,
            });
          }}
        />
      )}
    </>
  );
}
