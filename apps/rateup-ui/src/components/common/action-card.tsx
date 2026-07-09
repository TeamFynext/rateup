import { Calendar } from "lucide-react";
import type { ReactNode } from "react";

import CreatedSinceText from "@/components/DateAndTime/CreatedSinceText/index.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  readonly title: ReactNode;
  readonly titleTooltip?: string;
  readonly subtitle?: ReactNode;
  readonly actions?: ReactNode;
  readonly content?: ReactNode;
  readonly footer?: ReactNode;
  readonly footerLeft?: ReactNode;
  readonly createdAt?: string | Date;
  readonly onClick?: () => void;
  readonly className?: string;
  readonly showSwitch?: boolean;
  readonly switchChecked?: boolean;
  readonly onSwitchChange?: (checked: boolean) => void;
}

export function ActionCard({
  title,
  titleTooltip,
  subtitle,
  actions,
  content,
  footer,
  footerLeft,
  createdAt,
  onClick,
  className,
  showSwitch,
  switchChecked,
  onSwitchChange,
}: Readonly<ActionCardProps>) {
  const footerContent = createdAt ? (
    <div className="ml-auto flex min-w-0 max-w-[60%] items-center gap-1 text-muted-foreground">
      <Calendar className="size-4 shrink-0" />
      <div className="min-w-0 overflow-hidden">
        <CreatedSinceText createdAt={createdAt} />
      </div>
    </div>
  ) : null;

  const hasFooter = footer || footerLeft || footerContent;

  return (
    <Card
      className={cn(
        "cursor-pointer ring-accent shadow-custom-base! hover:shadow-custom-hover! transition-shadow hover:-translate-y-0.5 gap-3.5",
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="flex justify-between">
        <div className="overflow-hidden">
          <CardTitle title={titleTooltip} className="truncate">
            {title}
          </CardTitle>
          {subtitle && <CardDescription className="truncate">{subtitle}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {showSwitch && (
            <Switch
              checked={switchChecked}
              onCheckedChange={(checked) => {
                onSwitchChange?.(checked);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {actions}
        </div>
      </CardHeader>

      {content && (
        <>
          <CardContent>{content}</CardContent>
          <Separator className="max-w-[calc(100%-45px)] mx-auto" />
        </>
      )}

      {hasFooter && (
        <CardFooter className="flex items-center justify-between gap-2">
          {footerLeft || footer}
          {footerContent}
        </CardFooter>
      )}
    </Card>
  );
}
