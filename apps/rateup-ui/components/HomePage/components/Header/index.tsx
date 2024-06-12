import { Flex, Group, Image } from "@mantine/core";
import classNames from "classnames/bind";
import Link from "next/link";
import { useRouter } from "next/router";
import { getNavLinksArray, rateupLogoBlueTextUrl } from "../../constants";
import styles from "./Header.module.css";
import LoginSignupLinks from "./LoginSignupLinks";
import MobileNavDrawer from "./MobileNavDrawer/MobileNavDrawer";

const cx = classNames.bind(styles);

function Header({ className = "" }) {
  const router = useRouter();
  const currentRoutePath = router.asPath;

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
            {getNavLinksArray(
              `${cx("header-link")} header-link`,
              currentRoutePath,
            )}
          </Flex>
          <MobileNavDrawer />
        </nav>
      </Group>
      <LoginSignupLinks />
    </Flex>
  );
}

export default Header;
