"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Flex, Group } from "@mantine/core";
import classNames from "classnames/bind";

import { useCheckSession } from "../../../../hooks/checkSession";
import BookDemoContactForm, { JoinNowButton } from "../BookDemoContactForm";
import styles from "./Header.module.css";

const cx = classNames.bind(styles);

function LoginSignupLinks() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useCheckSession();

  return (
    <Group wrap="nowrap" className={cx("login-signup-links-container")}>
      {session ? (
        <Link
          href="/dashboard"
          className={`${cx("go-to-dashboard-link")} go-to-dashboard-link`}
        >
          DashBoard
        </Link>
      ) : pathname === "/digital-menu" ? (
        <>
          <Flex className={cx("join-now-btn-container")}>
            <JoinNowButton
              buttonProps={{
                style: { fontSize: "1rem", padding: "0.625rem 1rem" },
              }}
            />
          </Flex>
        </>
      ) : (
        <>
          <Link href="/login" className={`${cx("login-link")} login-link`}>
            <span className={cx("login-link-text-span")}>Login</span>
          </Link>
          <Link href="/signup" className={`${cx("login-link")} login-link`}>
            <span className={cx("login-link-text-span")}>Signup</span>
          </Link>
        </>
      )}
    </Group>
  );
}

export default LoginSignupLinks;
