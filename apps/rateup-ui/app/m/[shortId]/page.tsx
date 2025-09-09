import { cookies } from "next/headers";

import { setCookie } from "cookies-next/client";

import MenuLandingPage from "@/app/m/[shortId]/menuLandingPage";
import { getMenuBannerByMenuId } from "@/backend/menu/Banner/banner.api";
import {
  getFullMenuPublicById,
  updateMenuVisitedMutation,
} from "@/backend/menu/menu.api";

async function MenuRedirect(props) {
  const params = await props?.params;
  const { shortId } = params;
  const fullMenu = await getFullMenuPublicById(shortId);
  const menuBanner = await getMenuBannerByMenuId(shortId);
  const cookieStore = await cookies();
  const pageVisited = cookieStore.get("pageVisited");

  if (!pageVisited && fullMenu && !fullMenu?.expiry) {
    await updateMenuVisitedMutation(fullMenu.id);
    setCookie("pageVisited", "true", {
      httpOnly: true,
    });
  }
  return <MenuLandingPage fullMenu={fullMenu} menuBanner={menuBanner} />;
}

export default MenuRedirect;
