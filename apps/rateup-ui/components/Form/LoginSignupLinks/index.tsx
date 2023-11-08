import { Group } from "@mantine/core";
import Link from "next/link";
import styles from "./LoginsignupLinks.module.css";

type LoginSignupLInksProps = {
  isLogin?: boolean;
  isSignup?: boolean;
};

function LoginSignupLinks({ isLogin, isSignup }: LoginSignupLInksProps) {
  return (
    <Group justify="center" className={styles["login-signup-links-container"]}>
      <Link
        href="/login"
        className={`
            ${styles["login-signup-link"]}
            ${isLogin ? styles["active-link"] : ""}
          `}
      >
        Login
      </Link>
      <Link
        href="/signup"
        className={`
            ${styles["login-signup-link"]}
            ${isSignup ? styles["active-link"] : ""}
          `}
      >
        Sign Up
      </Link>
    </Group>
  );
}

export default LoginSignupLinks;
