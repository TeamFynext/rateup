"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { IconFolderCode } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Rule } from "@/types/rule";
import { GenericCardGrid } from "@/components/common/generic-card";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { createSortableHeader, DataTable } from "@/components/Table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";

import { RuleCard } from "./rule-card";

interface CardViewProps {
  data: Rule[];
  viewMode: "grid" | "list";
  onToggleActive: (item: Rule) => void;
  onDelete: (id: string) => void;
}

export function CardView({
  data,
  viewMode,
  onToggleActive,
  onDelete,
}: Readonly<CardViewProps>) {
  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const translations = useTranslations();
  const router = useRouter();

  const columns = useMemo<ColumnDef<Rule>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.original.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.triggerEvent}
            </span>
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
          <span className="text-sm font-semibold">
            {row.original.actions?.length || 0}
          </span>
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
              setRuleToDelete(row.original.id);
              setDeleteDialogOpened(true);
            }}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onToggleActive, setDeleteDialogOpened, setRuleToDelete],
  );

  return (
    <>
      {data.length === 0 ? (
        <div className="col-span-full">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconFolderCode />
              </EmptyMedia>
              <EmptyTitle>No Automation Yet</EmptyTitle>
              <EmptyDescription>
                You haven&apos;t created any automation yet. Get started by
                creating your first automation.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/dashboard/automation/new">Create Automation</Link>
              </Button>
            </EmptyContent>
            {/* <Button
              variant="link"
              asChild
              className="text-muted-foreground"
              size="sm"

            >
              <Link href="https://docs.rateup.app/automation/overview" target="_blank">
                Learn More <ArrowUpRightIcon />
              </Link>
            </Button> */}
          </Empty>
        </div>
      ) : viewMode === "grid" ? (
        <GenericCardGrid
          items={data}
          getKey={(item) => item.id}
          renderItem={(item) => (
            <Link href={`/dashboard/automation/${item.id}`}>
              <RuleCard
                item={item}
                onToggleActive={() => {
                  onToggleActive(item);
                }}
                onDelete={(event) => {
                  event.preventDefault();
                  setRuleToDelete(item.id);
                  setDeleteDialogOpened(true);
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
            router.push(`/dashboard/automation/${row.id}`);
          }}
        />
      )}
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={() => {
          setDeleteDialogOpened(false);
          setRuleToDelete(null);
        }}
        headerLabel={translations("Are you sure you want to delete this Rule?")}
        headerTitle={translations("Delete Rule")}
        confirmLabel={translations("Delete")}
        onConfirm={() => {
          if (ruleToDelete) {
            onDelete(ruleToDelete);
            setDeleteDialogOpened(false);
            setRuleToDelete(null);
          }
        }}
      />
    </>
  );
}
