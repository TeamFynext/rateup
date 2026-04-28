"use client";

import { ReactNode } from "react";

import { cx } from "class-variance-authority";
import { Calendar } from "lucide-react";

import CreatedSinceText from "@/components/DateAndTime/CreatedSinceText";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const footerRightNode = createdAt ? (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Calendar className="size-4" />
      <CreatedSinceText createdAt={createdAt} />
    </div>
  ) : (
    footerRight
  );

  return (
    <Card
      className={cx(
        className,
        "cursor-pointer hover:ring-1 hover:ring-primary gap-3.5",
      )}
      onClick={onClick}
    >
      <CardHeader className="flex justify-between">
        <div className="overflow-hidden">
          <CardTitle title={titleTooltip} className="truncate">
            {title}
          </CardTitle>
          {subtitle ? (
            <CardDescription className="truncate">{subtitle}</CardDescription>
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
      </CardHeader>
      {content && <CardContent>{content}</CardContent>}
      <Separator className="max-w-[calc(100%-45px)] mx-auto" />
      <CardFooter className="flex justify-between">
        {footerLeft}
        {footerRightNode}
      </CardFooter>
    </Card>
  );
}
