import { Button } from "@rateup/ui/components/button";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { Switch } from "@rateup/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rateup/ui/components/tabs";
import {
  IconArrowLeft,
  IconChartBar,
  IconExternalLink,
  IconLink,
  IconPalette,
  IconShare,
} from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useImmerReducer } from "use-immer";

import type { LinktreeData } from "@/backend/linktree/linktree.api.ts";
import { useGetLinktreeWithShortId } from "@/backend/linktree/linktree.query";
import { PhonePreviewButton } from "@/components/ui/phone-preview.tsx";
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

  if (data && !isPending) return <Editor page={data} tab={tab ?? "links"} />;

  return (
    <EditorFrame title={isPending ? <Skeleton className="h-5 w-40" /> : null}>
      {isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-72 max-w-full" />
          <Skeleton className="h-9 w-96 max-w-full" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : isError && isNotFound(error) ? (
        <RecordNotFound
          title={t("This link page doesn't exist")}
          description={t("It may have been deleted. Your other link pages are on the list.")}
        />
      ) : (
        <ListLoadError onRetry={() => void refetch()} />
      )}
    </EditorFrame>
  );
}

/**
 * The automation builder's chrome: a full-bleed 56px breadcrumb bar, level with the device
 * preview panel's header beside it, over a scrolling page.
 */
function EditorFrame({
  title,
  actions,
  children,
}: Readonly<{ title: ReactNode; actions?: ReactNode; children: ReactNode }>) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to={QR_LINKS_PATHS.linkPages}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <IconArrowLeft className="size-3.5" aria-hidden />
            {t("Link-in-bio Pages")}
          </Link>
          <span className="text-muted-foreground/50" aria-hidden>
            /
          </span>
          {title && (
            <span className="truncate font-display text-[15px] font-semibold">{title}</span>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex w-full max-w-265 flex-col gap-4">{children}</div>
      </div>
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
    <EditorFrame
      title={page.name}
      actions={
        <>
          {/* The shared device panel, the same phone the WhatsApp previews use. */}
          <PhonePreviewButton platform="browser" defaultOpen>
            <div className="flex min-h-0 flex-1 flex-col">{preview}</div>
          </PhonePreviewButton>
          {page.isPublished && (
            <Button
              variant="outline"
              size="sm"
              render={<a href={url} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              <IconExternalLink data-icon="inline-start" />
              {t("Open")}
            </Button>
          )}
          <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium has-disabled:cursor-not-allowed has-disabled:opacity-60">
            {t("Published")}
            <Switch
              checked={!!page.isPublished}
              disabled={update.isPending || (!page.isPublished && links.length === 0)}
              onCheckedChange={(checked) => void setPublished(checked)}
            />
          </label>
        </>
      }
    >
      <StatusLine
        live={!!page.isPublished}
        label={
          page.isPublished
            ? t("Live at {url}", { url: url.replace(/^https?:\/\//, "") })
            : t("Draft. Publish it to share the link.")
        }
      />
      {!page.isPublished && links.length === 0 && (
        <p className="-mt-2 text-sm text-muted-foreground">
          {t("Add at least one link before you publish.")}
        </p>
      )}

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(LINK_PAGE_TABS.find((name) => name === value) ?? "links")}
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
        <TabsContent value="appearance" className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("Updates as you edit. Theme changes go live when you save.")}
          </p>
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
    </EditorFrame>
  );
}
