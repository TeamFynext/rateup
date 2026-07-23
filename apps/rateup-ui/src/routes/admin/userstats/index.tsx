import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Calendar, Mail, Pause, Play, Shield, UserCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAllOrgs } from "@/backend/org/org.query";
import {
  useGetAllUsers,
  useUpdateRecipeNameMutation,
  useUpdateUserPause,
} from "@/backend/user/user.query";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import {
  formatIsoDateStringWithTime,
  isInLastSevenDays,
  isThisMonth,
  isToday,
  isYesterday,
} from "@/utils/dateTime.ts";
import type { UserRole } from "@/utils/enums/index.ts";
import { getUserRoleColor, UserRoleLabel } from "@/utils/index.ts";

import { DataTableToolbar } from "../../../components/admin/userstats/data-table-toolbar.tsx";
import UserModal from "../../../components/admin/userstats/UserModal.tsx";

export const Route = createFileRoute("/admin/userstats/")({
  component: Index,
});

interface UserTableData {
  id: string;
  name: string;
  orgName: string;
  role: string;
  signupDate: string;
  recipeName: string;
  status: boolean;
  isPaused: boolean;
}

function Index() {
  const { data: orgs, isLoading: orgsLoading } = useAllOrgs();
  const { data: users, isLoading: usersLoading, isError } = useGetAllUsers();
  const updateRecipeMutation = useUpdateRecipeNameMutation();
  const updatePauseStatus = useUpdateUserPause();
  const { t: translations } = useTranslation();

  const [userStats, setUserStats] = useState({
    today: 0,
    yesterday: 0,
    lastWeek: 0,
    thisMonth: 0,
  });

  const [opened, { open, close }] = useDisclosure(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUpdatedRecipe, setIsUpdatedRecipe] = useState(false);
  const confirm = useConfirm();

  const columns: ColumnDef<UserTableData>[] = [
    {
      accessorKey: "id",
      header: createSortableHeader("Email ID"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{row.getValue("id")}</span>
        </div>
      ),
      meta: { title: "Email ID" },
    },
    {
      accessorKey: "name",
      header: createSortableHeader("Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
      meta: { title: "Name" },
    },
    {
      accessorKey: "orgName",
      header: createSortableHeader("Organization"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("orgName")}</span>
        </div>
      ),
      meta: { title: "Organization" },
    },
    {
      accessorKey: "role",
      header: createSortableHeader("Role"),
      cell: ({ row }) => {
        const role: keyof typeof UserRole = row.getValue("role");
        return (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className={`text-${getUserRoleColor(role)}-600`}>
              <UserRoleLabel role={role} />
            </Badge>
          </div>
        );
      },
      meta: { title: "Role" },
    },
    {
      accessorKey: "signupDate",
      header: createSortableHeader("SignUp Date"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("signupDate")}</span>
        </div>
      ),
      meta: { title: "SignUp Date" },
    },
    {
      accessorKey: "recipeName",
      header: createSortableHeader("Recipe"),
      cell: ({ row }) => <span className="text-sm">{row.getValue("recipeName") || "N/A"}</span>,
      meta: { title: "Recipe" },
    },
    {
      accessorKey: "isPaused",
      header: createSortableHeader("Is Paused"),
      cell: ({ row }) => {
        const isPaused = row.getValue("isPaused");
        return (
          <Badge variant={isPaused ? "destructive" : "secondary"}>{isPaused ? "YES" : "NO"}</Badge>
        );
      },
      meta: { title: "Is Paused" },
    },
    {
      accessorKey: "status",
      header: createSortableHeader("Status"),
      cell: ({ row }) => {
        const active = row.getValue("status");
        return (
          <Badge variant={active ? "default" : "destructive"}>
            {active ? translations("Active") : translations("Inactive")}
          </Badge>
        );
      },
      meta: { title: "Status" },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isPaused = row.original.isPaused;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              const user = users?.find((user) => user.email === row.original.id);
              await handlePauseResumeClick(user);
            }}
            className="h-8 w-8 p-0"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
        );
      },
      meta: { title: "Actions" },
    },
  ];

  const handlePauseResumeClick = async (user: any) => {
    const shouldProceed = await confirm({
      title: user?.isPaused ? translations("Resume User") : translations("Pause User"),
      description: `${translations("Are you sure to")} ${
        user?.isPaused ? translations("resume") : translations("pause")
      } ${translations("this user?")}`,
      confirmText: "Yes",
      cancelText: translations("cancel"),
    });

    if (!shouldProceed) return;

    setSelectedUser(user);
    updatePauseStatus.mutate({
      userId: user.userId,
      data: { isPaused: !user.isPaused, pausedBy: "rateup" },
    });
  };

  const handleUpdateUserRecipe = () => {
    toast.loading(translations("Recipes getting updated"), {
      id: "user-recipe",
    });
    updateRecipeMutation.mutate();
  };

  useEffect(() => {
    if (users) {
      const today = users.filter((user) => isToday(user?.createdAt))?.length || 0;
      const yesterday = users.filter((user) => isYesterday(user.createdAt))?.length || 0;
      const lastWeek = users.filter((user) => isInLastSevenDays(user?.createdAt))?.length || 0;
      const thisMonth = users.filter((user) => isThisMonth(user?.createdAt))?.length || 0;

      setUserStats({
        today,
        yesterday,
        lastWeek,
        thisMonth,
      });

      setIsUpdatedRecipe(users.filter((user) => !user.recipeName)?.length ? false : true);
    }
  }, [users]);

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>An error occurred while loading users.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (usersLoading || orgsLoading)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );

  const tableData: UserTableData[] =
    users?.map((user) => ({
      id: user?.email,
      name: user?.userName,
      orgName: user?.orgName,
      role: user?.role,
      signupDate: formatIsoDateStringWithTime(user?.createdAt),
      recipeName: user?.recipeName,
      status: user?.active,
      isPaused: user?.isPaused,
    })) || [];

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                {translations("User Stats")}
              </h1>
            </div>
            <RefreshButton queryKeys={["allUsers", "org"]} />
          </div>
          <Button
            onClick={handleUpdateUserRecipe}
            disabled={isUpdatedRecipe}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {translations("Update User Recipe")}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Organizations
                </CardTitle>
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {orgs?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total orgs</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {users?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total users</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-green-200 dark:border-green-800">
            <div className="absolute inset-0 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {translations("Today")}
                </CardTitle>
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {userStats.today}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">New users</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-amber-200 dark:border-amber-800">
            <div className="absolute inset-0 bg-linear-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {translations("Yesterday")}
                </CardTitle>
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                {userStats.yesterday}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Previous day</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-purple-200 dark:border-purple-800">
            <div className="absolute inset-0 bg-linear-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {translations("Last 7 days")}
                </CardTitle>
                <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                  7d
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {userStats.lastWeek}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Weekly growth</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-rose-200 dark:border-rose-800">
            <div className="absolute inset-0 bg-linear-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {translations("This Month")}
                </CardTitle>
                <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                  30d
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-rose-700 dark:text-rose-400">
                {userStats.thisMonth}
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Monthly total</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <h2 className="text-xl font-semibold tracking-tight">
        {translations("Most Recent SignUps")}
      </h2>
      <p className="text-sm text-muted-foreground">Manage and view all users in your system</p>
      <div>
        <DataTable
          columns={columns}
          data={tableData}
          DataTableToolbar={DataTableToolbar}
          onRowClick={(row) => {
            const user = users?.find((user) => user.email === row.id);
            setSelectedUser(user);
            open();
          }}
        />
      </div>
      <Dialog
        open={opened}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) close();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-225">
          <DialogTitle className="sr-only">{translations("User details")}</DialogTitle>
          <UserModal selectedUser={selectedUser} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
