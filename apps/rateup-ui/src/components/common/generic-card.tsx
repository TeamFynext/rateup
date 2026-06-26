import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CardGridProps<T> = {
  readonly items: readonly T[];
  readonly getKey: (item: T, index: number) => string;
  readonly renderItem: (item: T, index: number) => ReactNode;
  readonly className?: string;
};

export function CardGrid<T>({ items, getKey, renderItem, className }: Readonly<CardGridProps<T>>) {
  return (
    <motion.div
      layout
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5",
        className,
      )}
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
