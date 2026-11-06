import { useEffect } from "react";

import { usePageVisitsOrLinkClicksUpdateMutation } from "@/backend/linktree/linktree.query";

const STORAGE_KEY = "linktreeVisitsData";
const COOLDOWN_MS = 60 * 60 * 1000;

/** Per-page timestamps of this browser's last visit and last click on each link. */
type VisitLog = Record<
  string,
  { lastVisitedAt?: string; linkClicks: Record<string, { lastClickedAt: string } | undefined> }
>;

function readLog(): VisitLog {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as VisitLog) : {};
  } catch {
    return {};
  }
}

function isFresh(iso: string | undefined) {
  return !!iso && Date.now() - new Date(iso).getTime() < COOLDOWN_MS;
}

/**
 * Counts a visit, and each link's click, at most once an hour per browser. The key and shape
 * in localStorage predate this hook; returning visitors already carry them.
 */
export function useLinkPageTracking(shortUrlId: string) {
  const { mutate } = usePageVisitsOrLinkClicksUpdateMutation(shortUrlId);

  useEffect(() => {
    const log = readLog();
    const entry = log[shortUrlId] ?? { linkClicks: {} };
    if (isFresh(entry.lastVisitedAt)) return;
    log[shortUrlId] = { ...entry, lastVisitedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    mutate({ resourceToBeUpdated: "page-visit" });
  }, [shortUrlId]);

  return (linkId: string) => {
    const log = readLog();
    const entry = log[shortUrlId] ?? { linkClicks: {} };
    if (isFresh(entry.linkClicks[linkId]?.lastClickedAt)) return;
    entry.linkClicks[linkId] = { lastClickedAt: new Date().toISOString() };
    log[shortUrlId] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    mutate({ resourceToBeUpdated: "link-click", linkId });
  };
}
