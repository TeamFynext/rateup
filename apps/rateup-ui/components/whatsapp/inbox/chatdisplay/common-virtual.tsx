import React from "react";

import { faker } from "@faker-js/faker";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LoaderIcon } from "lucide-react";

// Constants
export const CHAT_PAGE_SIZE = 10;
export const QUERY_KEY = ["chat-messages"];
export const VIRTUAL_ITEM_ESTIMATED_SIZE = 45;
export const VIRTUAL_OVERSCAN = 5;
export const SCROLL_OFFSET_AFTER_FETCH = 50;
export const SCROLL_DURATION = 0;

// Types
interface MessagePage {
  rows: Array<string>;
  nextOffset: number;
}

// Custom hook for handling infinite scroll with auto-scroll to bottom
export function useAutoScrollToBottom(
  virtualItemsLength: number,
  scrollIntoView: () => void,
) {
  const hasScrolledRef = React.useRef(false);

  React.useEffect(() => {
    if (!hasScrolledRef.current && virtualItemsLength > 0) {
      hasScrolledRef.current = true;
      Promise.resolve().then(() => {
        scrollIntoView();
      });
    }
  }, [virtualItemsLength, scrollIntoView]);
}

// Custom hook for fetching more messages when scrolling to top
export function useFetchOnIntersect(
  entry: IntersectionObserverEntry | null,
  fetchNextPage: () => Promise<unknown>,
  dataLength: number,
  rowVirtualizer,
  isFetchingNextPage: boolean,
) {
  React.useEffect(() => {
    if (entry?.isIntersecting && !isFetchingNextPage) {
      fetchNextPage()?.then(() => {
        rowVirtualizer.scrollToIndex(10, {
          align: "start",
          behavior: "auto",
        });
      });
    }
  }, [entry, fetchNextPage, dataLength, rowVirtualizer, isFetchingNextPage]);
}

// Loading indicator component
export const LoadingIndicator: React.FC = () => (
  <div className="flex items-center justify-center gap-4">
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className="size-4 animate-spin"
    />
  </div>
);

// Virtual message item component
interface VirtualMessageItemProps {
  virtualRow: ReturnType<
    ReturnType<typeof useVirtualizer>["getVirtualItems"]
  >[number];
  message: string | React.ReactNode;
  measureElement: (node: Element | null) => void;
  isLoaderRow: boolean;
  hasNextPage: boolean;
}

export const VirtualMessageItem: React.FC<VirtualMessageItemProps> = ({
  virtualRow,
  message,
  measureElement,
  isLoaderRow,
  hasNextPage,
}) => (
  <div
    key={virtualRow.index}
    data-index={virtualRow.index}
    ref={measureElement}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      transform: `translateY(${virtualRow.start}px)`,
    }}
  >
    {isLoaderRow ? hasNextPage && "" : message}
  </div>
);
