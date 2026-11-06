import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { LinktreeData } from "@/backend/linktree/linktree.api";
import { useLinkPageTracking } from "@/components/(public-facing)/lt/$shortId/useLinkPageTracking.ts";
import { LinkPageView } from "@/components/dashboard/qr-links/link-pages/LinkPageView.tsx";
import { DEFAULT_LINK_PAGE_THEME } from "@/components/dashboard/qr-links/link-pages/theme.ts";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import { rateupIconBw } from "@/utils/constants";

export const Route = createFileRoute("/(public-facing)/lt/$shortId/")({
  component: LinkPage,
  loader: async ({ params }) => {
    // Imported here: route options land in the client entry, and the API client is axios.
    const { getPublicLinktreeWithShortId } = await import("@/backend/linktree/linktree.api");
    const page = await getPublicLinktreeWithShortId(params.shortId);
    return { page: page?.isPublished ? page : null };
  },
});

function LinkPage() {
  const { page } = Route.useLoaderData();
  const { t } = useTranslation();
  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 p-4">
        <img src={rateupIconBw} alt="" width={56} height={56} />
        <p className="text-2xl font-bold text-muted-foreground">{t("This page isn't available")}</p>
      </div>
    );
  }
  return <PublishedLinkPage page={page} />;
}

function PublishedLinkPage({ page }: Readonly<{ page: LinktreeData }>) {
  const onLinkClick = useLinkPageTracking(page.shortUrlId);
  const isPhone = useMediaQuery("(max-width: 425px)");
  const theme = page.theme ?? DEFAULT_LINK_PAGE_THEME;
  const { desktopBgImgUrl, mobileBgImgUrl } = theme.background;

  return (
    <LinkPageView
      theme={theme}
      links={page.links ?? []}
      backgroundImage={(isPhone ? mobileBgImgUrl : desktopBgImgUrl) ?? null}
      onLinkClick={onLinkClick}
      className="min-h-screen"
    />
  );
}
