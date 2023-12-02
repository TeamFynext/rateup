import { Flex, Image, Group } from "@mantine/core";
import styles from "./Header.module.css";
import { getNavLinksArray } from "../../constants";
import LoginSignupLinks from "./LoginSignupLinks";
import MobileNav from "./MobileNav";
import Link from "next/link";
import Button from "../Button";
import { useRouter } from "next/router";

function Header() {
  const router = useRouter();
  const currentRoutePath = router.pathname;

  return (
    <Flex justify="space-between" className={styles["header-container"]}>
      <Group gap={"xl"} className={styles["logo-nav-container"]} wrap="nowrap">
        <Link href="/">
          <Image
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/logo.svg`}
            alt="logo"
            w={110}
            h={110}
            fit="contain"
          />
        </Link>
        <nav>
          <Flex className={styles["header-links-container"]}>
            {getNavLinksArray(styles["header-link"], true)}
          </Flex>
          <MobileNav />
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
