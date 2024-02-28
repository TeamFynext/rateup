import { Flex, Drawer, Burger, Image, Menu, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import styles from "./MobileNavDrawer.module.css";
import headerStyles from "../Header.module.css";
import drawerStyles from "./Drawer.module.css";
import menuStyles from "./Menu.module.css";
import Link from "next/link";
import { getMobileNavLinkMenuItems, rateupLogoUrl } from "../../../constants";
import { useEffect } from "react";
import { useRouter } from "next/router";

function MobileNavDrawer() {
  const [
    isNavDrawerOpen,
    { open: openNavDrawer, close: closeNavDrawer, toggle },
  ] = useDisclosure(false);

  const isViewportLEQ1024px = useMediaQuery("(max-width: 1024px");
  const isViewportLEQ768px = useMediaQuery("(max-width: 768px");

  const router = useRouter();
  useEffect(() => {
    closeNavDrawer();
  }, [router]);

  useEffect(() => {
    if (!isViewportLEQ1024px) {
      closeNavDrawer();
    }
  }, [isViewportLEQ1024px]);

  return (
    <Flex className={styles["mobile-nav-drawer-container"]}>
      <Burger
        className="mobile-nav-burger-icon"
        onClick={() => toggle()}
        aria-label="Toggle navigation"
        size={"lg"}
        color="#2564ae"
      />

      <Drawer
        opened={isNavDrawerOpen}
        position={isViewportLEQ768px ? "right" : "left"}
        onClose={closeNavDrawer}
        title={
          <Link href="/">
            <Image src={rateupLogoUrl} alt="logo" w={75} h={65} fit="contain" />
          </Link>
        }
        zIndex={500}
        classNames={drawerStyles}
        size={"400px"}
      >
        <Menu classNames={menuStyles}>
          {getMobileNavLinkMenuItems(
            `${headerStyles["header-link"]} ${styles["mobile-nav-drawer-link"]}`,
          )}

          <Menu.Item
            component="div"
            className={styles["login-signup-menu-item"]}
          >
            <Link href="/login" className={`${headerStyles["login-link"]}`}>
              Login
              <Text
                inherit
                span
                className={headerStyles["login-link-text-span-container"]}
              >
                <Text
                  inherit
                  span
                  className={headerStyles["login-link-text-span"]}
                >
                  Login
                </Text>
              </Text>
            </Link>

            <Link href="/signup" className={`${headerStyles["signup-link"]}`}>
              Sign Up
            </Link>
          </Menu.Item>
        </Menu>
      </Drawer>
    </Flex>
  );
}

export default MobileNavDrawer;
