import {
  IconAlertTriangle,
  IconCalendar,
  IconCode,
  IconShield,
  IconUser,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
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

// Routes that deserve a plain-English label instead of the generic
// "<Resource> <action>" derived from the URL. Channel connect/disconnect lives
// under /settings and /auth, which would otherwise read as "Settings created".
const ROUTE_OVERRIDES: { method: string; pattern: RegExp; label: string }[] = [
  { method: "POST", pattern: /^\/api\/wa\/settings\/?$/, label: "Channel added" },
  { method: "PUT", pattern: /^\/api\/wa\/settings\/?$/, label: "Channel updated" },
  { method: "POST", pattern: /^\/api\/wa\/auth\/register\/?$/, label: "Channel added" },
  { method: "DELETE", pattern: /^\/api\/wa\/settings\/[^/]+\/?$/, label: "Channel removed" },
  { method: "POST", pattern: /^\/api\/wa\/auth\/deregister\/[^/]+\/?$/, label: "Channel removed" },
];

const matchRouteOverride = (method: string, route: string): string | null => {
  const path = route.split("?")[0];
  const upperMethod = method.toUpperCase();

  return (
    ROUTE_OVERRIDES.find((o) => o.method === upperMethod && o.pattern.test(path))?.label ?? null
  );
};

const formatActionMessage = (method: string, route: string): string => {
  const override = matchRouteOverride(method, route);
  if (override) return override;

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
// The values the generic audit hook writes into `action`; anything else is an
// explicit, already human-readable label recorded by a handler (e.g. "Channel added").
const GENERIC_ACTIONS = new Set(["Create", "Update", "Delete", "Other"]);

const ActionCell = ({
  action,
  method,
  route,
}: {
  action?: string;
  method: string;
  route: string;
}) => {
  const formattedMessage = useMemo(() => {
    if (action && !GENERIC_ACTIONS.has(action)) return action;

    return formatActionMessage(method, route);
  }, [action, method, route]);

  return (
    <div className="flex items-center gap-2">
      <IconShield className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="font-medium">{formattedMessage}</span>
    </div>
  );
};

const UserCell = ({ user }: { user?: { name?: string } }) => (
  <div className="flex items-center gap-2">
    <IconUser className="h-4 w-4 text-muted-foreground shrink-0" />
    <span className="font-mono text-xs text-muted-foreground max-w-[150px] truncate">
      {user?.name || "N/A"}
    </span>
  </div>
);

const RequestBodyCell = ({ body }: { body: unknown }) => (
  <div className="flex items-center gap-2">
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={<div className="flex items-center gap-2 cursor-pointer" />}
      >
        <IconCode className="h-4 w-4 text-muted-foreground shrink-0" />
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
    <IconCode className="h-4 w-4 text-muted-foreground shrink-0" />
    {/* <span className="text-xs text-muted-foreground max-w-[100px] truncate">
      {body ? JSON.stringify(body) : "Empty"}
    </span> */}
  </div>
);

const TimestampCell = ({ timestamp }: { timestamp: string }) => (
  <div className="flex items-center gap-2">
    <IconCalendar className="h-4 w-4 text-muted-foreground shrink-0" />
    <span className="text-sm">{formatTimestamp(timestamp)}</span>
  </div>
);

export const ErrorCard = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[50vh]">
    <Card className="w-96">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5" />
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
    cell: ({ row }) => (
      <ActionCell
        action={row.original?.action}
        method={row.original?.method}
        route={row.original?.route}
      />
    ),
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
