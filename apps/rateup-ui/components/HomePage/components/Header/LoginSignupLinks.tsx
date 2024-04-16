import { Group, Text } from "@mantine/core";
import Link from "next/link";
import styles from "./Header.module.css";
import { useCheckSession } from "../../../../hooks/checkSession";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

function LoginSignupLinks() {
  const session = useCheckSession();

  return (
    <Group wrap="nowrap" className={cx("login-signup-links-container")}>
      {session ? (
        <Link
          href="/dashboard"
          className={`${cx("go-to-dashboard-link")} go-to-dashboard-link`}
        >
          Go To DashBoard
        </Link>
      ) : (
        <>
          <Link href="/login" className={`${cx("login-link")} login-link`}>
            <span className={cx("login-link-text-span")}>Login</span>
          </Link>
          <Link href="/signup" className={`${cx("signup-link")} signup-link`}>
            Sign Up
          </Link>
        </>
      )}
    </Group>
  );
}

export default LoginSignupLinks;
