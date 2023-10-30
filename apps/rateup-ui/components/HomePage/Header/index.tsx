import { Flex, Image, Group } from "@mantine/core";
import styles from "./Header.module.css";
import { getNavLinksArray } from "../constants";
import LoginSignupLinks from "./LoginSignupLinks";
import MobileNav from "./MobileNav";

function Header() {
  return (
    <section className={styles["header"]}>
      <Flex justify="space-between" className={styles["header-container"]}>
        <Group
          gap={"xl"}
          className={styles["logo-nav-container"]}
          wrap="nowrap"
        >
          <Image
            src="/images/logo.svg"
            alt="logo"
            w={110}
            h={110}
            fit="contain"
          />
          <nav>
            <Flex className={styles["header-links-container"]}>
              {getNavLinksArray(styles["header-link"])}
            </Flex>
            <MobileNav />
          </nav>
        </Group>
        <LoginSignupLinks />
      </Flex>
    </section>
  );
}

export default Header;
