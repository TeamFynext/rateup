"use client";

import Link from "next/link";

import { Group } from "@mantine/core";
import { useExtracted } from "next-intl";

import styles from "./LoginsignupLinks.module.css";

type LoginSignupLInksProps = {
  isLogin?: boolean;
  isSignup?: boolean;
};

function LoginSignupLinks({ isLogin, isSignup }: LoginSignupLInksProps) {
  const translations = useExtracted();
  return (
    <Group justify="center" className={styles["login-signup-links-container"]}>
      <Link
        href="/login"
        className={`
            ${styles["login-signup-link"]}
            ${isLogin ? styles["active-link"] : ""}
          `}
      >
        {translations("Login")}
      </Link>
      <Link
        href="/signup"
        className={`
            ${styles["login-signup-link"]}
            ${isSignup ? styles["active-link"] : ""}
          `}
      >
        {translations("Sign Up")}
      </Link>
    </Group>
  );
}

export default LoginSignupLinks;
