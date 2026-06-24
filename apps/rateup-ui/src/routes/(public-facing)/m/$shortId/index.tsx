import { createFileRoute } from "@tanstack/react-router";

import { getMenuBannerByMenuId } from "@/backend/menu/Banner/banner.api";
import { getFullMenuPublicById, updateMenuVisitedMutation } from "@/backend/menu/menu.api";
import MenuLandingPage from "@/components/(public-facing)/m/$shortId/menuLandingPage.tsx";

export const Route = createFileRoute("/(public-facing)/m/$shortId/")({
  component: MenuRedirect,
  loader: async ({ params }) => {
    const { shortId } = params;
    const fullMenu = await getFullMenuPublicById(shortId);
    const menuBanner = await getMenuBannerByMenuId(shortId);
    if (fullMenu && !fullMenu.expiry) {
      await updateMenuVisitedMutation(fullMenu.id);
    }
    return { fullMenu, menuBanner };
  },
});

function MenuRedirect() {
  const { fullMenu, menuBanner } = Route.useLoaderData();

  return <MenuLandingPage fullMenu={fullMenu} menuBanner={menuBanner} />;
}
