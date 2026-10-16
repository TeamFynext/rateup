import {
  IconDots,
  IconKey,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { MAX_API_KEYS, type ApiKey } from "@/backend/apiKeys/apiKeys.api.ts";
import { useApiKeys, useRevokeApiKey } from "@/backend/apiKeys/apiKeys.query.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils.ts";
import { formatToRelativeTime } from "@/utils/dateTime.ts";

import {
  ApiKeyFormDialog,
  RevealApiKeyDialog,
  RotateApiKeyDialog,
  type RevealedKey,
} from "./ApiKeyDialogs.tsx";
import {
  FEATURE_OPTIONS,
  isExpiringSoon,
  keyExpiry,
  maskedKeyPrefix,
  type KeyExpiry,
} from "./apiKeyFormat.ts";

/**
 * The org's partner API keys: one row per key, with create, edit, rotate and revoke for
 * anyone holding `api_tokens.manage`. Readers see the same table without the actions.
 */
export function ApiKeysCard({
  title,
  description,
  size,
}: Readonly<{
  /** Overrides the card's heading where it is embedded in another settings page. */
  title?: ReactNode;
  description?: ReactNode;
  size?: "default" | "sm";
}>) {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const canManage = permissions.can("api_tokens.manage");
  const canRead = permissions.can("api_tokens.read");
  const keys = useApiKeys(canRead);
  const revoke = useRevokeApiKey();
  const confirm = useConfirm();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiKey | undefined>();
  const [rotating, setRotating] = useState<ApiKey | undefined>();
  const [revealed, setRevealed] = useState<RevealedKey | null>(null);

  const list = keys.data ?? [];
  const atLimit = list.length >= MAX_API_KEYS;

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(key: ApiKey) {
    setEditing(key);
    setFormOpen(true);
  }

  async function handleRevoke(key: ApiKey) {
    const ok = await confirm({
      title: t("Revoke “{name}”?", { name: key.name }),
      description: t(
        "Requests using this key will be refused straight away. This can't be undone.",
      ),
      confirmText: t("Revoke key"),
      cancelText: t("Cancel"),
    });
    if (ok) revoke.mutate(key.id);
  }

  const createButton = canManage ? (
    <Button
      type="button"
      size="sm"
      onClick={openCreate}
      disabled={atLimit}
      title={atLimit ? t("Limit of {max} keys reached", { max: MAX_API_KEYS }) : undefined}
    >
      <IconPlus data-icon="inline-start" />
      {t("Create key")}
    </Button>
  ) : null;

  return (
    <Card size={size}>
      <CardHeader>
        <CardTitle>{title ?? t("API keys")}</CardTitle>
        <CardDescription>
          {description ??
            t(
              "Your server sends one of these with every RateUp API request. Use a separate key for each integration.",
            )}
        </CardDescription>
        {list.length > 0 && createButton && <CardAction>{createButton}</CardAction>}
      </CardHeader>
      <CardContent>
        {!permissions.isPending && !canRead ? (
          <p className="text-sm text-muted-foreground">
            {t("You don't have access to API keys. Ask an admin for the API keys permission.")}
          </p>
        ) : keys.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : keys.isError ? (
          <p className="text-sm text-muted-foreground">{t("Could not load your API keys.")}</p>
        ) : list.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconKey />
              </EmptyMedia>
              <EmptyTitle>{t("No API keys yet")}</EmptyTitle>
              <EmptyDescription>
                {t("Create a key to call the RateUp API from your own systems.")}
              </EmptyDescription>
            </EmptyHeader>
            {createButton && <EmptyContent>{createButton}</EmptyContent>}
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Key")}</TableHead>
                <TableHead>{t("Access")}</TableHead>
                <TableHead>{t("Created")}</TableHead>
                <TableHead>{t("Last used")}</TableHead>
                <TableHead>{t("Expires")}</TableHead>
                {canManage && (
                  <TableHead className="w-10">
                    <span className="sr-only">{t("Actions")}</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="max-w-48 truncate font-medium">{key.name}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <code className="font-mono text-xs text-muted-foreground">
                        {maskedKeyPrefix(key.displayPrefix)}
                      </code>
                      <Badge variant={key.mode === "live" ? "secondary" : "outline"}>
                        {key.mode === "live" ? t("Live") : t("Test")}
                      </Badge>
                      <Badge
                        variant="outline"
                        title={
                          key.version === "v1"
                            ? t("Works on the legacy v1 API only")
                            : t("Works on the v2 API only")
                        }
                      >
                        {key.version}
                      </Badge>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.scopes.length === 0
                      ? t("Full access")
                      : key.features.length === 0
                        ? t("Custom permissions")
                        : FEATURE_OPTIONS.filter((o) => key.features.includes(o.value))
                            .map((o) => t(o.label))
                            .join(", ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <time
                      dateTime={key.createdAt}
                      title={dayjs(key.createdAt).format("D MMM YYYY, h:mm A")}
                    >
                      {dayjs(key.createdAt).format("D MMM YYYY")}
                    </time>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.lastUsedAt ? (
                      <time
                        dateTime={key.lastUsedAt}
                        title={dayjs(key.lastUsedAt).format("D MMM YYYY, h:mm A")}
                      >
                        {formatToRelativeTime(key.lastUsedAt)}
                      </time>
                    ) : (
                      t("Never")
                    )}
                  </TableCell>
                  <TableCell>
                    <ExpiryCell expiresAt={key.expiresAt} />
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("Actions for {name}", { name: key.name })}
                            />
                          }
                        >
                          <IconDots />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(key)}>
                            <IconPencil />
                            {t("Edit")}
                          </DropdownMenuItem>
                          {/* A replaced key is already on its way out; the API refuses to
                              rotate it again, so rotate its replacement instead. */}
                          {!key.rotatedAt && (
                            <DropdownMenuItem onClick={() => setRotating(key)}>
                              <IconRefresh />
                              {t("Rotate")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleRevoke(key)}>
                            <IconTrash />
                            {t("Revoke")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {canManage && atLimit && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t(
              "You have {max} keys, the most an organisation can hold. Revoke one to create another.",
              {
                max: MAX_API_KEYS,
              },
            )}
          </p>
        )}
      </CardContent>

      {canManage && (
        <>
          <ApiKeyFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            editing={editing}
            onCreated={setRevealed}
          />
          <RotateApiKeyDialog
            apiKey={rotating}
            onOpenChange={(open) => {
              if (!open) setRotating(undefined);
            }}
            onRotated={setRevealed}
          />
          <RevealApiKeyDialog revealed={revealed} onClose={() => setRevealed(null)} />
        </>
      )}
    </Card>
  );
}

function ExpiryCell({ expiresAt }: Readonly<{ expiresAt: string | null }>) {
  const { t } = useTranslation();
  const expiry = keyExpiry(expiresAt);
  const label = expiryLabel(expiry, t);
  if (expiry.kind === "expired") return <Badge variant="destructive">{label}</Badge>;
  return (
    <span
      title={expiresAt ? dayjs(expiresAt).format("D MMM YYYY, h:mm A") : undefined}
      className={cn(
        "whitespace-nowrap",
        isExpiringSoon(expiry)
          ? "font-medium text-amber-700 dark:text-amber-500"
          : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function expiryLabel(expiry: KeyExpiry, t: TFunction): string {
  switch (expiry.kind) {
    case "never":
      return t("Never");
    case "expired":
      return t("Expired");
    case "minutes":
      return t("Expires in {count, plural, one {# minute} other {# minutes}}", {
        count: expiry.value,
      });
    case "hours":
      return t("Expires in {count}h", { count: expiry.value });
    case "days":
      return t("Expires in {count, plural, one {# day} other {# days}}", { count: expiry.value });
    case "date":
      return dayjs(expiry.at).format("D MMM YYYY");
  }
}
