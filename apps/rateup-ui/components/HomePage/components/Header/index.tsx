import { Flex, Image, Group } from "@mantine/core";
import styles from "./Header.module.css";
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
import { useHeadroom, useWindowScroll } from "@mantine/hooks";

function Header({ className = "" }) {
  const router = useRouter();
  const currentRoutePath = router.pathname;
  const pinned = useHeadroom({ fixedAt: 100 });
  const [scroll, scrollTo] = useWindowScroll();

  const applyTransaparentBackground =
    currentRoutePath === "/" && scroll.y < 100;

  return (
    <Flex
      justify="space-between"
      className={`${styles["header-container"]} ${className} ${
        applyTransaparentBackground ? `${styles["blue-background"]}` : ""
      } ${pinned ? `${styles["pinned"]}` : `${styles["unpinned"]}`}`}
    >
      <Group gap={"sm"} className={styles["logo-nav-container"]} wrap="nowrap">
        <Link href="/">
          <Image
            src={
              applyTransaparentBackground
                ? rateupLogoWhiteTextUrl
                : rateupLogoBlueTextUrl
            }
            alt="logo"
            w={85}
            fit="contain"
          />
        </Link>
        <nav>
          <Flex className={styles["header-links-container"]}>
            {getNavLinksArray(`${styles["header-link"]} header-link`)}
          </Flex>
          <MobileNavDrawer />
        </nav>
      </Group>
      {!(currentRoutePath === "/menus") ? (
        <LoginSignupLinks />
      ) : (
        <Flex className={styles["join-now-btn-container"]}>
          <Button>Join Now</Button>
        </Flex>
      )}
    </Flex>
  );
}

export default Header;
