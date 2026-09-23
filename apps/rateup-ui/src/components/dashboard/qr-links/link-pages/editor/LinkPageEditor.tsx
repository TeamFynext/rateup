import {
  IconChartBar,
  IconDeviceMobile,
  IconExternalLink,
  IconLink,
  IconPalette,
  IconShare,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useImmerReducer } from "use-immer";

import type { LinktreeData } from "@/backend/linktree/linktree.api.ts";
import { useGetLinktreeWithShortId } from "@/backend/linktree/linktree.query";
import { BackLink } from "@/components/common/back-link.tsx";
import { PAGE_TITLE } from "@/components/common/page-heading.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import { isNotFound } from "@/utils/apiError.ts";

import { ListLoadError, RecordNotFound } from "../../shared/ListStates.tsx";
import { linkPageUrl, QR_LINKS_PATHS } from "../../shared/paths.ts";
import { StatusLine } from "../../shared/StatusLine.tsx";
import { LinkPageView } from "../LinkPageView.tsx";
import { DEFAULT_LINK_PAGE_THEME, themeReducer } from "../theme.ts";
import { AppearancePanel } from "./AppearancePanel.tsx";
import { LinksPanel } from "./LinksPanel.tsx";
import { LINK_PAGE_TABS, type LinkPageTab } from "./search.ts";
import { SharePanel } from "./SharePanel.tsx";
import { StatsPanel } from "./StatsPanel.tsx";
import { useLinkPageMutations } from "./useLinkPageMutations.ts";

export function LinkPageEditor({
  shortUrlId,
  tab,
}: Readonly<{ shortUrlId: string; tab?: LinkPageTab }>) {
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch } = useGetLinktreeWithShortId(shortUrlId);

  const { update: setBreadcrumb } = useRouteParams();
  useEffect(() => {
    if (data?.name) setBreadcrumb({ shortUrlId: data.name });
  }, [data?.name]);

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-4">
      <BackLink to={QR_LINKS_PATHS.linkPages} label={t("Link pages")} />
      {isPending ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-96 max-w-full" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <Skeleton className="hidden h-150 rounded-[2.5rem] lg:block" />
        </div>
      ) : isError && isNotFound(error) ? (
        <RecordNotFound
          title={t("This link page doesn't exist")}
          description={t("It may have been deleted. Your other link pages are on the list.")}
        />
      ) : isError ? (
        <ListLoadError onRetry={() => void refetch()} />
      ) : (
        <Editor page={data} tab={tab ?? "links"} />
      )}
    </div>
  );
}

/** Mounted once the page has loaded, so the theme draft starts from the saved theme. */
function Editor({ page, tab }: Readonly<{ page: LinktreeData; tab: LinkPageTab }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [theme, dispatch] = useImmerReducer(themeReducer, page.theme ?? DEFAULT_LINK_PAGE_THEME);
  const { setPublished, update } = useLinkPageMutations(page.shortUrlId);
  const links = page.links ?? [];
  const url = linkPageUrl(page.shortUrlId);

  const setTab = (next: LinkPageTab) =>
    void navigate({
      to: QR_LINKS_PATHS.linkPage,
      params: { shortUrlId: page.shortUrlId },
      search: { tab: next },
      replace: true,
    });

  const preview = (
    <LinkPageView
      theme={theme}
      links={links}
      backgroundImage={theme.background.mobileBgImgUrl}
      className="h-full"
    />
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={`m-0 truncate ${PAGE_TITLE}`}>{page.name}</h1>
          <StatusLine
            live={!!page.isPublished}
            label={
              page.isPublished
                ? t("Live at {url}", { url: url.replace(/^https?:\/\//, "") })
                : t("Draft. Publish it to share the link.")
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" className="lg:hidden" />}>
              <IconDeviceMobile data-icon="inline-start" />
              {t("Preview")}
            </SheetTrigger>
            <SheetContent side="right" className="w-full gap-0 sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>{t("Preview")}</SheetTitle>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-hidden border-t">{preview}</div>
            </SheetContent>
          </Sheet>
          {page.isPublished && (
            <Button
              variant="outline"
              render={<a href={url} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              <IconExternalLink data-icon="inline-start" />
              {t("Open")}
            </Button>
          )}
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium has-disabled:cursor-not-allowed has-disabled:opacity-60">
            {t("Published")}
            <Switch
              checked={!!page.isPublished}
              disabled={update.isPending || (!page.isPublished && links.length === 0)}
              onCheckedChange={(checked) => void setPublished(checked)}
            />
          </label>
        </div>
      </div>
      {!page.isPublished && links.length === 0 && (
        <p className="-mt-2 text-sm text-muted-foreground">
          {t("Add at least one link before you publish.")}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Tabs
          value={tab}
          onValueChange={(value) =>
            setTab(LINK_PAGE_TABS.find((name) => name === value) ?? "links")
          }
          className="min-w-0 gap-4"
        >
          <TabsList>
            <TabsTrigger value="links">
              <IconLink />
              {t("Links")}
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <IconPalette />
              {t("Appearance")}
            </TabsTrigger>
            <TabsTrigger value="share">
              <IconShare />
              {t("Share")}
            </TabsTrigger>
            <TabsTrigger value="stats">
              <IconChartBar />
              {t("Stats")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="links">
            <LinksPanel shortUrlId={page.shortUrlId} links={links} />
          </TabsContent>
          <TabsContent value="appearance">
            <AppearancePanel
              shortUrlId={page.shortUrlId}
              saved={page.theme ?? DEFAULT_LINK_PAGE_THEME}
              theme={theme}
              dispatch={dispatch}
            />
          </TabsContent>
          <TabsContent value="share">
            <SharePanel page={page} />
          </TabsContent>
          <TabsContent value="stats">
            <StatsPanel page={page} />
          </TabsContent>
        </Tabs>

        <div className="sticky top-4 hidden lg:block">
          <div className="mx-auto h-150 w-75 overflow-hidden rounded-[2.5rem] border-8 border-foreground shadow-lg dark:border-muted">
            {preview}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("Updates as you edit. Theme changes go live when you save.")}
          </p>
        </div>
      </div>
    </>
  );
}
