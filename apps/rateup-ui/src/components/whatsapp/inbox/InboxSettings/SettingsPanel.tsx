import { cn } from "@/lib/utils.ts";

/**
 * The heading block every Inbox Settings panel shares: title, one line of
 * explanation, and an optional action on the right. Written once so the six
 * panels cannot drift in spacing or type scale.
 */
export function SettingsPanel({
  title,
  description,
  action,
  className,
  children,
}: Readonly<{
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2 className="text-base font-extrabold text-foreground">{title}</h2>
        {action}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

/** Centred placeholder for a panel whose list has nothing in it yet. */
export function SettingsEmpty({
  icon,
  message,
}: Readonly<{ icon?: React.ReactNode; message: string }>) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
      {icon}
      <p className="text-sm">{message}</p>
    </div>
  );
}
