import { useRef, useState } from "react";
import { Burger, Menu, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { getMobileNavLinkMenuItems } from "../../constants";
import styles from "./Header.module.css";
import Link from "next/link";

function MobileNav() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const mobileNavBurgerBtnContainerRef = useRef(null);

  const isViewPortLeq1024px = useMediaQuery("(max-width: 1024px)");
  const isViewPortLeq768px = useMediaQuery("(max-width: 768px)");

  if (!isViewPortLeq1024px && isMobileNavOpen) {
    setIsMobileNavOpen(false);
  }

  return (
    <div
      className={styles["mobile-nav-burger-btn-container"]}
      ref={mobileNavBurgerBtnContainerRef}
    >
      <Menu
        opened={isMobileNavOpen}
        portalProps={{ target: mobileNavBurgerBtnContainerRef.current }}
        position={isViewPortLeq768px ? "bottom-end" : "bottom-start"}
        offset={20}
        withArrow
        classNames={styles}
        transitionProps={{
          transition: "scale",
          duration: 300,
          timingFunction: "ease",
        }}
        onChange={(opened) => {
          setIsMobileNavOpen(opened);
        }}
      >
        <Menu.Target>
          <Burger
            opened={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-label="Toggle navigation"
            size={"lg"}
            color="#2564ae"
          />
        </Menu.Target>
        <Menu.Dropdown>
          {getMobileNavLinkMenuItems(styles["header-link"])}
          {isViewPortLeq768px && (
            <>
              <Menu.Item component="div">
                <Link href="/login" className={`${styles["login-link"]}`}>
                  <Text
                    inherit
                    span
                    className={styles["login-link-text-span-container"]}
                  >
                    <Text
                      inherit
                      span
                      className={styles["login-link-text-span"]}
                    >
                      Login
                    </Text>
                  </Text>
                </Link>
              </Menu.Item>

              <Menu.Item component="div">
                <Link href="/signup" className={`${styles["signup-link"]}`}>
                  Sign Up
                </Link>
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}

export default MobileNav;
