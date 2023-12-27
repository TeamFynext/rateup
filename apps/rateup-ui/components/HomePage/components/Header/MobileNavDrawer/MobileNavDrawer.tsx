import { Flex, Drawer, Burger, Image, Menu, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import styles from "./MobileNavDrawer.module.css";
import headerStyles from "../Header.module.css";
import Link from "next/link";
import { getMobileNavLinkMenuItems } from "../../../constants";
import { useEffect } from "react";

function MobileNavDrawer() {
  const [
    isNavDrawerOpen,
    { open: openNavDrawer, close: closeNavDrawer, toggle },
  ] = useDisclosure(false);

  const isViewportLEQ1024px = useMediaQuery("(max-width: 1024px");
  const isViewportLEQ768px = useMediaQuery("(max-width: 768px");

  useEffect(() => {
    if (!isViewportLEQ1024px) {
      closeNavDrawer();
    }
  }, [isViewportLEQ1024px]);

  return (
    <Flex className={styles["mobile-nav-drawer-container"]}>
      <Burger
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
            <Image
              src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/logo.svg`}
              alt="logo"
              w={75}
              h={65}
              fit="cover"
            />
          </Link>
        }
        zIndex={500}
        classNames={styles}
        size={"400px"}
      >
        <Menu classNames={styles}>
          {getMobileNavLinkMenuItems(
            `${headerStyles["header-link"]} ${styles["mobile-nav-drawer-link"]}`,
          )}

          <Menu.Item
            component="div"
            className={styles["login-signup-menu-item"]}
          >
            <Link href="/login" className={`${headerStyles["login-link"]}`}>
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
