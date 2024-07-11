import { Button, Image } from "@mantine/core";
import PublicMenu from "../../public/menu/[menuId]/feedback/[surveyId]";
import styles from "../../ws/[shortId]/ws.module.css";
import Link from "next/link";
import { imagePath } from "../../../components/HomePage/pages/constants";
import { getCookie, setCookie } from "cookies-next";
import {
  getFullMenuPublicById,
  updateMenuVisitedMutation,
} from "../../../backend/menu/menu.api";
import { NextApiRequest, NextApiResponse } from "next";
import { getMenuBannerByMenuId } from "backend/menu/Banner/banner.api";

interface ServerSidePropsContext {
  req: NextApiRequest;
  res: NextApiResponse;
  params: {
    shortId?: string;
  };
}

export const getServerSideProps = async ({
  req,
  res,
  params,
}: ServerSidePropsContext) => {
  try {
    const { shortId } = params;
    const fullMenu = await getFullMenuPublicById(shortId);
    const menuBanner = await getMenuBannerByMenuId(shortId);
    const pageVisited = getCookie("pageVisited", { req, res });
    if (!pageVisited && !fullMenu?.expiry) {
      setCookie("pageVisited", "true", {
        req,
        res,
        maxAge: 60 * 60,
        httpOnly: true,
      });
      await updateMenuVisitedMutation(fullMenu.id);
    }
    return { props: { fullMenu: fullMenu, menuBanner: menuBanner } };
  } catch (error) {
    console.error("error in getServerSideProps");
    return {
      props: { fullMenu: null, menuBanner: null, error_occured: true },
    };
  }
};

function MenuRedirect({ fullMenu, menuBanner, error_occured }) {
  if (error_occured) {
    return (
      <div className={styles["error-page"]}>
        <Link href="/">
          <Image
            w={80}
            src={`${imagePath}/rateup-logo-blue-text.svg`}
            alt="logo of rateup"
          />
        </Link>
        <p className={styles["error-text"]}>
          Unable to get Menu, please try again later
        </p>
        <Button
          className={styles["reload-btn"]}
          onClick={() => window.location.reload()}
        >
          Reload the page
        </Button>
      </div>
    );
  }
  return <PublicMenu fullMenu={fullMenu} menuBanner={menuBanner} />;
}

export default MenuRedirect;
