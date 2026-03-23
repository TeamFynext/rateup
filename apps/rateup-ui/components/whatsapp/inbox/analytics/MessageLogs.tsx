"use client";

import { useMemo, useState } from "react";

import { ColumnDef, Table } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  CheckCircle2,
  Clock,
  Download,
  Megaphone,
  MessageCircle,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { useExtracted } from "next-intl";

import { useWaMessageLogs } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { DataTable } from "@/components/Table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function MessageLogs({ dateRange }) {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const t = useExtracted();
  const { data: messageLogsData } = useWaMessageLogs({
    dateKey: dateRange.key,
    dateRange: dateRange.range,
    status: selectedStatus,
    source: selectedSource,
  });

  const filteredData = useMemo(() => {
    if (!messageLogsData) return [];

    if (!search.trim()) return messageLogsData;

    const term = search.toLowerCase();

    return messageLogsData.filter((item) => {
      return (
        item.phone?.toLowerCase().includes(term) ||
        item.messagePreview?.toLowerCase().includes(term)
      );
    });
  }, [messageLogsData, search]);

  function formatLabel(value?: string) {
    if (!value) return t("Export");
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  function getSourceBadge(source?: string) {
    const formatted = formatLabel(source);

    if (formatted === "Inbox") {
      return {
        className:
          "bg-blue-50 dark:bg-transparent text-blue-700 border-blue-200",
        icon: <MessageCircle className="w-3 h-3 mr-1" />,
      };
    }

    if (formatted === "Campaign") {
      return {
        className:
          "bg-orange-50 dark:bg-transparent text-orange-700 border-orange-200",
        icon: <Megaphone className="w-3 h-3 mr-1" />,
      };
    }

    if (formatted === "Template") {
      return {
        className:
          "bg-purple-50 dark:bg-transparent text-purple-700 border-purple-200",
        icon: <Megaphone className="w-3 h-3 mr-1" />,
      };
    }

    return {
      className: "bg-gray-50 dark:bg-transparent text-gray-600 border-gray-200",
      icon: null,
    };
  }

  function getStatusBadge(status?: string) {
    const s = status || "unknown";

    if (s === "delivered") {
      return {
        className:
          "bg-green-50 dark:bg-transparent text-green-700 border-green-200",
        icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
      };
    }

    if (s === "sent") {
      return {
        className:
          "bg-blue-50 dark:bg-transparent text-blue-700 border-blue-200",
        icon: <Send className="w-3 h-3 mr-1" />,
      };
    }

    if (s === "read") {
      return {
        className:
          "bg-indigo-50 dark:bg-transparent text-indigo-700 border-indigo-200",
        icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
      };
    }

    if (s === "failed") {
      return {
        className: "bg-red-50 dark:bg-transparent text-red-700 border-red-200",
        icon: <XCircle className="w-3 h-3 mr-1" />,
      };
    }

    return {
      className: "bg-gray-50 dark:bg-transparent text-gray-600 border-gray-200",
      icon: <Clock className="w-3 h-3 mr-1" />,
    };
  }

  function exportToCSV(data: any[], filename = "message_logs.csv") {
    if (!data || data.length === 0) return;

    const headers = [
      "Timestamp",
      "Phone",
      "Status",
      "Source",
      "Type",
      "Message",
      "Logs",
    ];

    const rows = data.map((row) => [
      dayjs(row.createdAt).format("DD/MM/YYYY hh:mm A"),
      row.phone || "",
      row.status || "",
      formatLabel(row.sourceMessage),
      row.messageType || "",
      row.messagePreview || "",
      typeof row.logs === "object" ? JSON.stringify(row.logs) : row.logs || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: t("Timestamp"),
        cell: ({ row }) => (
          <div className="text-sm text-slate-600">
            {dayjs(row.original.createdAt).format("DD/MM/YYYY hh:mm A")}
          </div>
        ),
      },

      {
        accessorKey: "phone",
        header: t("Phone"),
        cell: ({ row }) => (
          <div className="font-mono text-sm">{row.original.phone}</div>
        ),
      },
      {
        accessorKey: "status",
        header: t("Status"),
        cell: ({ row }) => {
          const status = row.original.status;
          const { className, icon } = getStatusBadge(status);

          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium capitalize ${className}`}
            >
              {icon}
              {status || "unknown"}
            </span>
          );
        },
      },

      {
        accessorKey: "sourceMessage",
        header: t("Source"),
        cell: ({ row }) => {
          const source = row.original.sourceMessage;
          const { className, icon } = getSourceBadge(source);

          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${className}`}
            >
              {icon}
              {formatLabel(source)}
            </span>
          );
        },
      },

      {
        accessorKey: "messageType",
        header: t("Type"),
        cell: ({ row }) => (
          <div className="text-xs text-slate-500">
            {row.original.messageType}
          </div>
        ),
      },

      {
        accessorKey: "messagePreview",
        header: t("Message"),
        cell: ({ row }) => (
          <div className="max-w-75 truncate text-sm">
            {row.original.messagePreview || "-"}
          </div>
        ),
      },

      {
        accessorKey: "logs",
        header: t("Logs"),
        cell: ({ row }) => (
          <div className="text-xs text-red-500">{row.original.logs || "-"}</div>
        ),
      },
    ],
    [],
  );
  return (
    <div className="h-full relative">
      <div className="p-3 border shadow-xs rounded-xl mb-4 bg-white dark:bg-transparent">
        <div className="flex items-center gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("Search phone or message")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-8"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearch("")}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value)}
          >
            <SelectTrigger className="h-8 w-full max-w-44">
              <SelectValue placeholder={t("All Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Status")}</SelectItem>
              <SelectItem value="delivered">{t("Delivered")}</SelectItem>
              <SelectItem value="failed">{t("Failed")}</SelectItem>
              <SelectItem value="read">{t("Read")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedSource}
            onValueChange={(value) => setSelectedSource(value)}
          >
            <SelectTrigger className="h-8 w-full max-w-44">
              <SelectValue placeholder={t("All Sources")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Sources")}</SelectItem>
              <SelectItem value="INBOX">{t("Inbox")}</SelectItem>
              <SelectItem value="CAMPAIGN">{t("Campaign")}</SelectItem>
              <SelectItem value="TEMPLATE">{t("Template")}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => exportToCSV(filteredData || [])}
          >
            <Download className="w-4 h-4 mr-2" />
            {t("Export")}
          </Button>
        </div>
      </div>
      <DataTable columns={columns} data={filteredData} />
    </div>
  );
}

export default MessageLogs;
