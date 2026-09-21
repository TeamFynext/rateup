import type { ComponentType, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { BackLink } from "@/components/common/back-link.tsx";
import { cn } from "@/lib/utils";

import { IntegrationPlate } from "./IntegrationPlate.tsx";

/**
 * The status line every integration page opens with. A sentence rather than a pill: what an
 * admin comes here to check is *which* store or account is wired up, and a green chip cannot
 * say that. `detail` is that fact — a shop domain, an account email, an endpoint — and pages
 * whose query does not return one fall back to the bare state.
 */
function ConnectionStatus({
  connected,
  detail,
}: Readonly<{ connected: boolean; detail?: ReactNode }>) {
  const { t } = useTranslation();

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          connected
            ? "bg-green-600 motion-safe:animate-pulse dark:bg-green-500"
            : "bg-muted-foreground/40",
        )}
      />
      <span>{connected ? t("Connected") : t("Not connected")}</span>
      {connected && detail ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="min-w-0 truncate text-foreground">{detail}</span>
        </>
      ) : null}
    </p>
  );
}

/**
 * The frame all eleven integration pages sit in: the same width as Settings › Account, the
 * same header, the same rhythm. A page passes its own cards as `children` and sets no
 * padding, width or height of its own.
 */
export function IntegrationShell({
  icon,
  name,
  connected,
  detail,
  own = false,
  action,
  children,
}: Readonly<{
  icon: ComponentType<{ className?: string }>;
  name: string;
  /** Omitted on a service that is never "connected" — the API key and the widget snippet. */
  connected?: boolean;
  detail?: ReactNode;
  own?: boolean;
  action?: ReactNode;
  children: ReactNode;
}>) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6 pb-2">
      <div className="flex flex-col gap-4">
        <BackLink to="/dashboard/settings/integrations" label={t("Integrations")} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <IntegrationPlate icon={icon} connected={connected ?? false} own={own} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="font-display truncate text-2xl font-semibold">{name}</h2>
              {connected === undefined ? null : (
                <ConnectionStatus connected={connected} detail={detail} />
              )}
            </div>
          </div>
          {action}
        </div>
      </div>

      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

/**
 * A labelled group of cards. Only used on a page that has more than one group — a label over
 * a lone group would be decorating it rather than telling you anything.
 */
export function IntegrationSection({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</h3>
      {children}
    </section>
  );
}
