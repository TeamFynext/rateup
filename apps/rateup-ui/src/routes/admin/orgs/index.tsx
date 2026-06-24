import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { ArrowRight, Building2, Calendar, Mail, Send, UserCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { useAllOrgs } from "@/backend/org/org.query";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  formatIsoDateStringWithTime,
  isInLastSevenDays,
  isThisMonth,
  isToday,
  isYesterday,
} from "@/utils/dateTime.ts";

import { DataTableToolbar } from "../../../components/admin/orgs/data-table-toolbar.tsx";

export const Route = createFileRoute("/admin/orgs/")({
  component: OrgDisplay,
});

interface OrgTableData {
  id: string;
  name: string;
  createdAt: string;
  owner: string;
  ownerEmail: string;
  teams: number;
  members: number;
  invitations: number;
  lastActivity: string | null;
  deletionMail: string | null;
}

function OrgDisplay() {
  const navigate = useNavigate();
  const { data: orgs, isLoading, isError } = useAllOrgs();
  const [orgStats, setOrgStats] = useState({
    today: 0,
    yesterday: 0,
    lastWeek: 0,
    thisMonth: 0,
  });

  const columns: ColumnDef<OrgTableData>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground">{row.getValue("id")}</div>
      ),
      meta: { title: "ID" },
    },
    {
      accessorKey: "name",
      header: createSortableHeader("Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
      meta: { title: "Name" },
    },
    {
      accessorKey: "createdAt",
      header: createSortableHeader("Created At"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("createdAt")}</span>
        </div>
      ),
      meta: { title: "Created At" },
    },
    {
      accessorKey: "lastActivity",
      header: createSortableHeader("Last Activity"),
      cell: ({ row }) => {
        const value = row.getValue("lastActivity") as string | number | Date | undefined;

        if (!value) {
          return <span className="text-muted-foreground">No activity</span>;
        }

        const isOld = dayjs(value).isBefore(dayjs().subtract(6, "month"));

        return (
          <div className="flex items-center gap-2">
            <Calendar
              className={`h-4 w-4 ${isOld ? "text-red-500 font-medium" : "text-muted-foreground"}`}
            />
            <span className={`text-sm ${isOld ? "text-red-500 font-medium" : ""}`}>
              {formatIsoDateStringWithTime(value)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "owner",
      header: createSortableHeader("Owner"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <span>{row.getValue("owner")}</span>
        </div>
      ),
      meta: { title: "Owner" },
    },
    {
      accessorKey: "ownerEmail",
      header: createSortableHeader("Owner Email"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("ownerEmail")}</span>
        </div>
      ),
      meta: { title: "Owner Email" },
    },
    {
      accessorKey: "teams",
      header: createSortableHeader("Teams"),
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono">
          {row.getValue("teams")}
        </Badge>
      ),
      meta: { title: "Teams" },
    },
    {
      accessorKey: "members",
      header: createSortableHeader("Staff"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="font-mono">
            {row.getValue("members")}
          </Badge>
        </div>
      ),
      meta: { title: "Staff" },
    },
    {
      accessorKey: "invitations",
      header: createSortableHeader("Invitations"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-muted-foreground" />
          <Badge
            variant={Number(row.getValue("invitations") ?? 0) > 0 ? "default" : "secondary"}
            className="font-mono"
          >
            {row.getValue("invitations")}
          </Badge>
        </div>
      ),
      meta: { title: "Invitations" },
    },
    {
      accessorKey: "deletionMail",
      header: createSortableHeader("Deletion Mail"),
      cell: ({ row }) => {
        const value = row.getValue("deletionMail") as string | number | Date | undefined;

        if (!value) {
          return <span className="text-muted-foreground">Not sent</span>;
        }

        const isOld = dayjs(value).isBefore(dayjs().subtract(7, "day"));

        return (
          <div className="flex items-center gap-2">
            <Mail className={`h-4 w-4 ${isOld ? "text-red-500" : "text-muted-foreground"}`} />
            <span className={`text-sm ${isOld ? "text-red-500 font-medium" : ""}`}>
              {formatIsoDateStringWithTime(value)}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate({
              to: `/admin/orgs/${row.original.id}`,
            });
          }}
          className="h-8 w-8 p-0"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      ),
      meta: { title: "Actions" },
    },
  ];

  useEffect(() => {
    if (orgs) {
      const today = orgs.filter((org) => isToday(org.createdAt))?.length || 0;
      const yesterday = orgs.filter((org) => isYesterday(org.createdAt))?.length || 0;
      const lastWeek = orgs.filter((org) => isInLastSevenDays(org.createdAt))?.length || 0;
      const thisMonth = orgs.filter((org) => isThisMonth(org.createdAt))?.length || 0;

      setOrgStats({
        today,
        yesterday,
        lastWeek,
        thisMonth,
      });
    }
  }, [orgs]);

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>An error occurred while loading organizations.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) return <RateupLoader h={"100dvh"} />;

  const tableData: OrgTableData[] = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    createdAt: formatIsoDateStringWithTime(org.createdAt),
    owner: org.owner.name,
    ownerEmail: org.owner.email,
    teams: org._count.teams,
    members: org._count.members,
    invitations: org._count.invitations,
    lastActivity: org.AuditLog[0]?.createdAt || null,
    deletionMail: org.deletionMailSent ?? null,
  }));

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
            </div>
            <RefreshButton queryKeys={["org"]} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Organizations
                </CardTitle>
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {orgs?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active organizations</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-green-200 dark:border-green-800">
            <div className="absolute inset-0 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Created Today
                </CardTitle>
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {orgStats.today}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">New registrations</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-amber-200 dark:border-amber-800">
            <div className="absolute inset-0 bg-linear-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Created Yesterday
                </CardTitle>
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                {orgStats.yesterday}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Previous day</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-purple-200 dark:border-purple-800">
            <div className="absolute inset-0 bg-linear-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Last 7 Days
                </CardTitle>
                <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                  7d
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {orgStats.lastWeek}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Weekly growth</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-rose-200 dark:border-rose-800">
            <div className="absolute inset-0 bg-linear-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  This Month
                </CardTitle>
                <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                  30d
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-rose-700 dark:text-rose-400">
                {orgStats.thisMonth}
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Monthly total</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight">Organization Management</h2>
      <p className="text-sm text-muted-foreground">
        Manage and view all organizations in your system
      </p>
      <div>
        <DataTable columns={columns} data={tableData} DataTableToolbar={DataTableToolbar} />
      </div>
    </div>
  );
}
