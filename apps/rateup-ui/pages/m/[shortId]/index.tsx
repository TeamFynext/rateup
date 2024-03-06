import { Button, Image } from "@mantine/core";
import PublicMenu from "../../public/menu/[menuId]/feedback/[surveyId]";
import styles from "../../ws/[shortId]/ws.module.css";
import Link from "next/link";
import { imagePath } from "../../../components/HomePage/pages/constants";
import { getCookie, setCookie } from "cookies-next";
import {
  getMenuPublicById,
  updateMenuVisitedMutation,
} from "../../../backend/menu/menu.api";
import { NextApiRequest, NextApiResponse } from "next";

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
    const menuLanding = await getMenuPublicById(shortId);
    const pageVisited = getCookie("pageVisited", { req, res });
    if (!pageVisited && !menuLanding?.expiry) {
      setCookie("pageVisited", "true", {
        req,
        res,
        maxAge: 60 * 60,
        httpOnly: true,
      });
      await updateMenuVisitedMutation(menuLanding.menu.id);
    }
    return { props: { menuLanding: menuLanding } };
  } catch (error) {
    console.error("error in getServerSideProps");
    return {
      props: { menuLanding: null, error_occured: true },
    };
  }
};

function MenuRedirect({ menuLanding, error_occured }) {
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
  return <PublicMenu menuLanding={menuLanding} fromShortUrl />;
}

export default MenuRedirect;
