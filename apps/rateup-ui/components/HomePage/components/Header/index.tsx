"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Flex, Group, Image } from "@mantine/core";
import { useWindowScroll } from "@mantine/hooks";
import classNames from "classnames/bind";

import { useCurrentPath } from "@/hooks/currentPath";

import {
  getNavLinksArray,
  rateupLogoBlueTextUrl,
  rateupLogoWhiteTextUrl,
} from "../../constants";
import styles from "./Header.module.css";
import LoginSignupLinks from "./LoginSignupLinks";
import MobileNavDrawer from "./MobileNavDrawer/MobileNavDrawer";

const cx = classNames.bind(styles);

function Header({ className = "", withWhiteTextLogo = false }) {
  const [scroll, scrollTo] = useWindowScroll();
  const scrollY = scroll.y;

  const router = useRouter();
  const currentRoutePath = useCurrentPath();

  const pathname = usePathname();

  const isProductPackagingPage = pathname === "/product-packaging-qr";

  return (
    <Flex
      justify="space-between"
      className={cx(className, "header-container", {
        isProductPackagingPage,
        "header-visible": isProductPackagingPage && scrollY > 150,
      })}
    >
      <Group gap={"sm"} className={cx("logo-nav-container")} wrap="nowrap">
        <Link href="/">
          <Image
            src={
              withWhiteTextLogo ? rateupLogoWhiteTextUrl : rateupLogoBlueTextUrl
            }
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
