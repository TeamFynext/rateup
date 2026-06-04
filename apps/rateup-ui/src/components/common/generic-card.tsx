"use client";

import type { ReactNode } from "react";

import { cx } from "class-variance-authority";
import { Calendar } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

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

import { Switch } from "../ui/switch.tsx";

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
    <motion.div
      layout
      className={
        className ??
        "grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5"
      }
    >
      <AnimatePresence initial={false}>
        {items.map((item, index) => {
          const key = getKey(item, index);

          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.98 }}
              transition={{
                duration: 0.24,
                ease: "easeOut",
                layout: { duration: 0.28, ease: "easeInOut" },
              }}
            >
              {renderItem(item, index)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
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
    <div className="ml-auto flex min-w-0 max-w-[60%] items-center gap-1 text-muted-foreground">
      <Calendar className="size-4 shrink-0" />
      <div className="min-w-0 overflow-hidden">
        <CreatedSinceText createdAt={createdAt} />
      </div>
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
      <CardFooter className="flex items-center justify-between gap-2">
        {footerLeft}
        {footerRightNode}
      </CardFooter>
    </Card>
  );
}
