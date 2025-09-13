"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Burger, Drawer, Flex, Image, Menu, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import classNames from "classnames/bind";

import { useCurrentPath } from "@/hooks/currentPath";

import { getMobileNavLinkMenuItems, rateupLogoUrl } from "../../../constants";
import headerStyles from "../Header.module.css";
import drawerStyles from "./Drawer.module.css";
import menuStyles from "./Menu.module.css";
import styles from "./MobileNavDrawer.module.css";

const cx = classNames.bind(styles);
const heCx = classNames.bind(headerStyles);

function MobileNavDrawer() {
  const [
    isNavDrawerOpen,
    { open: openNavDrawer, close: closeNavDrawer, toggle },
  ] = useDisclosure(false);

  const isViewportLEQ1024px = useMediaQuery("(max-width: 1024px");
  const isViewportLEQ768px = useMediaQuery("(max-width: 768px");

  const router = useRouter();
  const currentRoutePath = useCurrentPath();

  useEffect(() => {
    closeNavDrawer();
  }, [router]);

  useEffect(() => {
    if (!isViewportLEQ1024px) {
      closeNavDrawer();
    }
  }, [isViewportLEQ1024px]);

  return (
    <Flex className={cx("mobile-nav-drawer-container")}>
      <Burger
        className="mobile-nav-burger-icon"
        onClick={() => toggle()}
        aria-label="Toggle navigation"
        size={"30"}
        color="var(--shade-of-blue-8)"
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
            `${headerStyles["header-link"]} ${cx("mobile-nav-drawer-link")}`,
            currentRoutePath,
          )}

          <Menu.Item component="div" className={cx("login-signup-menu-item")}>
            <Link href="/login" className={`${heCx("login-link")} login-link`}>
              <span className={heCx("login-link-text-span")}>Login</span>
            </Link>

            <Link href="/signup" className={heCx("signup-link")}>
              Sign Up
            </Link>
          </Menu.Item>
        </Menu>
      </Drawer>
    </Flex>
  );
}

export default MobileNavDrawer;
