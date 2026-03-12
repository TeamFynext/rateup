"use client";

import { ReactNode } from "react";

import { Calendar } from "lucide-react";

import CreatedSinceText from "@/components/DateAndTime/CreatedSinceText";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { Switch } from "../ui/switch";

type GenericCardGridProps<T> = {
  readonly items: readonly T[];
  readonly getKey: (item: T, index: number) => string;
  readonly renderItem: (item: T, index: number) => ReactNode;
  readonly className?: string;
};

export function GenericCardGrid<T>({
  items,
  getKey,
  renderItem,
  className,
}: Readonly<GenericCardGridProps<T>>) {
  return (
    <div
      className={
        className ??
        "grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5"
      }
    >
      {items.map((item, index) => (
        <div key={getKey(item, index)}>{renderItem(item, index)}</div>
      ))}
    </div>
  );
}

type GenericActionCardProps = {
  readonly title: ReactNode;
  readonly titleTooltip?: string;
  readonly subtitle?: ReactNode;
  readonly actions?: ReactNode;
  readonly content?: ReactNode;
  readonly footerLeft?: ReactNode;
  /** Renders a standard calendar icon + relative date in the footer right. Takes precedence over footerRight. */
  readonly createdAt?: string | Date;
  /** Custom footer right content. Use createdAt for the standard date display. */
  readonly footerRight?: ReactNode;
  readonly onClick?: () => void;
  readonly className?: string;

  readonly showSwitch?: boolean;
  readonly switchChecked?: boolean;
  readonly onSwitchChange?: (checked: boolean) => void;
};

export function GenericActionCard({
  title,
  titleTooltip,
  subtitle,
  actions,
  content,
  footerLeft,
  createdAt,
  footerRight,
  onClick,
  className,
  showSwitch,
  switchChecked,
  onSwitchChange,
}: Readonly<GenericActionCardProps>) {
  const cardClassName =
    className ??
    "h-full cursor-pointer border transition-colors hover:border-primary";

  const footerRightNode = createdAt ? (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Calendar className="size-4" />
      <CreatedSinceText createdAt={createdAt} />
    </div>
  ) : (
    footerRight
  );

  return (
    <Card className={cardClassName} onClick={onClick}>
      <CardContent className="flex h-full flex-col justify-between gap-4 px-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 overflow-hidden">
              <h3
                className="truncate text-lg font-semibold"
                title={titleTooltip}
              >
                {title}
              </h3>

              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
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
          </div>

          {content}
        </div>

        <div>
          <Separator className="mb-3" />
          <div className="flex items-center justify-between">
            {footerLeft}
            {footerRightNode}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
