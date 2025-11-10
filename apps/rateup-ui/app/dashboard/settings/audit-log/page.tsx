"use client";

import { useState } from "react";

import {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import { Calendar, Code, Globe, Shield, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { AuditLogData } from "@/backend/user/user.api";
import { useUserAuditLogs } from "@/backend/user/user.query";
import RefreshButton from "@/components/Button/RefreshButton";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { createSortableHeader, DataTable } from "@/components/Table/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { DataTableToolbar } from "./data-table-toolbar";

const columns: ColumnDef<AuditLogData>[] = [
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{row.getValue("action")}</span>
      </div>
    ),
  },
  {
    accessorKey: "method",
    header: createSortableHeader("Method"),
    cell: ({ row }) => {
      const method: string = row.getValue("method");
      const getMethodColor = () => {
        switch (method?.toUpperCase()) {
          case "GET":
            return "secondary";
          case "POST":
            return "default";
          case "PUT":
          case "PATCH":
            return "outline";
          case "DELETE":
            return "destructive";
          default:
            return "outline";
        }
      };

      return <Badge variant={getMethodColor()}>{method}</Badge>;
    },
  },
  {
    accessorKey: "route",
    header: createSortableHeader("Route"),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-xs max-w-[200px] truncate">
          {row.getValue("route")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "user",
    // header: "User Name",
    header: createSortableHeader("User Name"),

    accessorFn: (row) => row.user?.name,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground max-w-[150px] truncate">
          {row.getValue("user") || "N/A"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "body",
    header: "Request Body",
    cell: ({ row }) => {
      const body = row.getValue("body");
      return (
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground max-w-[100px] truncate">
            {body ? "Present" : "Empty"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: createSortableHeader("Timestamp"),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {dayjs(row.getValue("createdAt")).format("YYYY-MM-DD HH:mm:ss")}
        </span>
      </div>
    ),
  },
];
const AuditLogs = () => {
  const translations = useTranslations();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const params = {
    pagination,
    sorting,
  };
  const { data, isFetched, isLoading, isError } = useUserAuditLogs(params);
  if (isError) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              An error occurred while loading audit logs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) return <RateupLoader h={"100dvh"} />;

  const tableData = isFetched ? data?.data : [];

  return (
    <div className="container mx-auto space-y-4">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                {translations("AuditLogs")}
              </h1>
            </div>
            <RefreshButton queryKeys={["userAuditLogs"]} />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        DataTableToolbar={DataTableToolbar}
        manualPagination={{
          pagination,
          onPaginationChange: setPagination,
          rowCount: data?.pagination?.total || 0,
          sorting,
          onSortingChange: setSorting,
        }}
      />
    </div>
  );
};

export default AuditLogs;
