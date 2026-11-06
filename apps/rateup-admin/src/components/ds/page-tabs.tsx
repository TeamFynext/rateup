import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface PageTab<T extends string> {
  value: T;
  label: string;
  content: ReactNode;
  /** Warms this tab's queries when the trigger is hovered or focused, so it opens filled. */
  prefetch?: () => void;
}

/** How long the outgoing tab's height is held before easing to the new one. */
const HOLD_MS = 260;

/** Clearance for the sticky phone header, so the tab row is not tucked under it. */
const STICKY_BAR_ALLOWANCE = 72;

/**
 * The console's section tabs: line tabs under a hairline. On
 * a phone the row scrolls sideways instead of wrapping. Only the active tab is mounted, so
 * each tab's query runs when it is opened.
 *
 * Switching used to lurch: the panel emptied, the page collapsed to the height of a
 * skeleton and whatever you were reading jumped up the screen. So the frame keeps the
 * height it had and eases to the new one, the new panel fades in, and hovering a tab
 * prefetches it — by the time it is clicked there is usually nothing to load.
 */
export function PageTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: PageTab<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const lastHeight = useRef(0);
  const [heldHeight, setHeldHeight] = useState<number>();

  // The height to fall back on, remeasured as the open tab grows (a list loading in, a
  // section expanding), so the hold is always the height the reader actually saw.
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (!heldHeight) lastHeight.current = element.getBoundingClientRect().height;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [heldHeight]);

  // Hold on the way out, then release: CSS eases min-height down, so a shorter tab settles
  // instead of snapping. A taller one overshoots the hold immediately and is unaffected.
  useEffect(() => {
    if (!lastHeight.current) return;
    setHeldHeight(lastHeight.current);
    const timer = setTimeout(() => setHeldHeight(undefined), HOLD_MS);
    return () => clearTimeout(timer);
  }, [value]);

  // Read halfway down a long tab, then switch to a short one and the page cannot stay where
  // it was — there is no longer that much of it. Rather than being dropped somewhere
  // arbitrary, glide up to the tab row, which is where the new tab begins.
  useEffect(() => {
    const strip = frame.current?.previousElementSibling;
    if (!strip) return;
    const top = strip.getBoundingClientRect().top + window.scrollY - STICKY_BAR_ALLOWANCE;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
  }, [value]);

  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)} className="gap-6">
      <div className="-mx-4 overflow-x-auto border-b px-4 scrollbar-none sm:mx-0 sm:px-0">
        <TabsList variant="line" className="h-11 gap-6 p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              onPointerEnter={tab.prefetch}
              onFocus={tab.prefetch}
              className="h-full flex-none px-0 text-sm font-medium text-muted-foreground data-active:text-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div
        ref={frame}
        style={heldHeight ? { minHeight: heldHeight } : undefined}
        className="transition-[min-height] duration-300 ease-out"
      >
        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
          >
            {tab.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
