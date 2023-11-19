import { Flex, Image, Group } from "@mantine/core";
import styles from "./Header.module.css";
import { getNavLinksArray } from "../../constants";
import LoginSignupLinks from "./LoginSignupLinks";
import MobileNav from "./MobileNav";
import Link from "next/link";

function Header() {
  return (
    <Flex justify="space-between" className={styles["header-container"]}>
      <Group gap={"xl"} className={styles["logo-nav-container"]} wrap="nowrap">
        <Link href="/">
          <Image
            src="/images/logo.svg"
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
      <LoginSignupLinks />
    </Flex>
  );
}

export default Header;
