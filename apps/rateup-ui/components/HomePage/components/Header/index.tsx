import { Flex, Image, Group } from "@mantine/core";
import styles from "./Header.module.css";
import { getNavLinksArray, rateupLogoUrl } from "../../constants";
import LoginSignupLinks from "./LoginSignupLinks";
import Link from "next/link";
import Button from "../Button";
import { useRouter } from "next/router";
import MobileNavDrawer from "./MobileNavDrawer/MobileNavDrawer";

function Header() {
  const router = useRouter();
  const currentRoutePath = router.pathname;

  return (
    <Flex justify="space-between" className={styles["header-container"]}>
      <Group gap={"xl"} className={styles["logo-nav-container"]} wrap="nowrap">
        <Link href="/">
          <Image src={rateupLogoUrl} alt="logo" w={110} h={110} fit="contain" />
        </Link>
        <nav>
          <Flex className={styles["header-links-container"]}>
            {getNavLinksArray(styles["header-link"], true)}
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
