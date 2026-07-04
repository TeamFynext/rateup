import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { AlertTriangle, Calendar, Code, Shield, User } from "lucide-react";
import { useMemo } from "react";

import type { AuditLogData } from "@/backend/user/user.api";
import { createSortableHeader } from "@/components/Table/data-table.tsx";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";

// Types
interface ParsedRoute {
  type: string | null;
  id: string | null;
  isValid: boolean;
}

// Constants
const ROUTE_PATTERNS = {
  WA: /\/api\/wa\/([^/]+)(?:\/([^/]+))?/,
  GENERAL: /\/api\/([^/]+)(?:\/([^/]+))?/,
} as const;

const ACTION_LABELS: Record<string, string> = {
  delete: "deleted",
  post: "created",
  put: "updated",
  patch: "updated",
  get: "viewed",
} as const;

const RESOURCE_TYPE_MAPPINGS: Record<string, string> = {
  contact: "Contact",
  "contact-group": "Contact Group",
  "wa-template": "WA Template",
  campaign: "Campaign",
  user: "User",
  organization: "Organization",
} as const;

// Utilities
const formatResourceType = (type: string): string => {
  if (RESOURCE_TYPE_MAPPINGS[type]) {
    return RESOURCE_TYPE_MAPPINGS[type];
  }

  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const parseRoute = (route: string): ParsedRoute => {
  for (const pattern of Object.values(ROUTE_PATTERNS)) {
    const match = pattern.exec(route);
    if (match) {
      const [, type, id] = match;
      return {
        type: formatResourceType(type),
        id: id?.startsWith(":") ? null : id || null,
        isValid: true,
      };
    }
  }

  return { type: null, id: null, isValid: false };
};

const formatActionMessage = (method: string, route: string): string => {
  const { type, id, isValid } = parseRoute(route);

  if (!isValid || !type) {
    return method.toUpperCase();
  }

  const actionLabel = ACTION_LABELS[method.toLowerCase()] || method.toLowerCase();

  return id ? `${type} ${id} ${actionLabel}` : `${type} ${actionLabel}`;
};

const formatTimestamp = (timestamp: string): string => {
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss");
};

// Components
const ActionCell = ({ action, route }: { action: string; route: string }) => {
  const formattedMessage = useMemo(() => formatActionMessage(action, route), [action, route]);

  return (
    <div className="flex items-center gap-2">
      <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="font-medium">{formattedMessage}</span>
    </div>
  );
};

const UserCell = ({ user }: { user?: { name?: string } }) => (
  <div className="flex items-center gap-2">
    <User className="h-4 w-4 text-muted-foreground shrink-0" />
    <span className="font-mono text-xs text-muted-foreground max-w-[150px] truncate">
      {user?.name || "N/A"}
    </span>
  </div>
);

const RequestBodyCell = ({ body }: { body: any }) => (
  <div className="flex items-center gap-2">
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={<div className="flex items-center gap-2 cursor-pointer" />}
      >
        <Code className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground max-w-[100px] truncate">
          {body ? JSON.stringify(body) : "Empty"}
        </span>
      </PopoverTrigger>

      <PopoverContent className="w-[500px] p-3">
        <ScrollArea className="max-h-[400px]">
          <pre className="text-xs whitespace-pre-wrap break-words">
            {body ? JSON.stringify(body) : "Empty"}
          </pre>
        </ScrollArea>
      </PopoverContent>
    </Popover>
    <Code className="h-4 w-4 text-muted-foreground shrink-0" />
    {/* <span className="text-xs text-muted-foreground max-w-[100px] truncate">
      {body ? JSON.stringify(body) : "Empty"}
    </span> */}
  </div>
);

const TimestampCell = ({ timestamp }: { timestamp: string }) => (
  <div className="flex items-center gap-2">
    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
    <span className="text-sm">{formatTimestamp(timestamp)}</span>
  </div>
);

export const ErrorCard = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[50vh]">
    <Card className="w-96">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Error
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  </div>
);

export const columns = [
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => <ActionCell action={row.original?.method} route={row.original?.route} />,
    meta: { title: "Action" },
  },
  {
    accessorKey: "user",
    header: createSortableHeader("User Name"),
    accessorFn: (row) => row.user?.name,
    cell: ({ row }) => <UserCell user={row.original?.user} />,
    meta: { title: "User Name" },
  },
  {
    accessorKey: "body",
    header: "Request Body",
    cell: ({ row }) => <RequestBodyCell body={row.getValue("body")} />,
    meta: { title: "Request Body" },
  },
  {
    accessorKey: "createdAt",
    header: createSortableHeader("Timestamp"),
    cell: ({ row }) => <TimestampCell timestamp={row.getValue("createdAt")} />,
    meta: { title: "Timestamp" },
  },
] as ColumnDef<AuditLogData>[];
