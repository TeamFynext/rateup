import { Group, Text } from "@mantine/core";
import Link from "next/link";
import styles from "./Header.module.css";

function LoginSignupLinks() {
  return (
    <Group wrap="nowrap" className={styles["login-signup-links-container"]}>
      <Link href="/login" className={`${styles["login-link"]}`}>
        <Text inherit span className={styles["login-link-text-span-container"]}>
          <Text inherit span className={styles["login-link-text-span"]}>
            Login
          </Text>
        </Text>
      </Link>
      <Link href="/signup" className={`${styles["signup-link"]}`}>
        Sign Up
      </Link>
    </Group>
  );
}

export default LoginSignupLinks;
