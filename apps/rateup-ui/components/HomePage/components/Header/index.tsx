import { Flex, Image, Group } from "@mantine/core";
import {
  getNavLinksArray,
  rateupLogoBlueTextUrl,
  rateupLogoWhiteTextUrl,
} from "../../constants";
import LoginSignupLinks from "./LoginSignupLinks";
import Link from "next/link";
import Button from "../Button";
import { useRouter } from "next/router";
import MobileNavDrawer from "./MobileNavDrawer/MobileNavDrawer";
import classNames from "classnames/bind";
import styles from "./Header.module.css";
import { isProduction } from "../../../../utils/constants";
import { analyseEvent } from "../../../../utils/gtag";
import { fbEvent } from "../../../../utils/fbpixel";
import BookDemoContactForm from "../BookDemoContactForm";
import { useCheckSession } from "../../../../hooks/checkSession";

const cx = classNames.bind(styles);

function Header({ className = "" }) {
  const router = useRouter();
  const currentRoutePath = router.pathname;
  const session = useCheckSession();

  return (
    <Flex justify="space-between" className={cx(className, "header-container")}>
      <Group gap={"sm"} className={cx("logo-nav-container")} wrap="nowrap">
        <Link href="/">
          <Image
            src={rateupLogoBlueTextUrl}
            alt="logo"
            w={"4.0625rem"}
            h={"3.125rem"}
            fit="contain"
          />
        </Link>
        <nav>
          <Flex className={cx("header-links-container")}>
            {getNavLinksArray(`${cx("header-link")} header-link`)}
          </Flex>
          <MobileNavDrawer />
        </nav>
      </Group>
      {
        // !(currentRoutePath === "/digital-menu") && !session ? (
        <LoginSignupLinks />
        // ) : (
        //   <Flex className={cx("join-now-btn-container")}>
        //     <BookDemoContactForm
        //       buttonText="Join Now"
        //       clickedFromPage="digital-menu-page"
        //       buttonProps={{ style: { fontSize: "1rem", padding: "0.625rem 1rem"}}}
        //     />
        //   </Flex>
        // )
      }
    </Flex>
  );
}

export default Header;
