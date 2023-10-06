import {
  Group,
  Image,
  Space,
} from "@mantine/core";

import Link from "next/link";
import classes from "./Header.module.css";
import { useUser } from "../../../context/UserContext";
import { Navbar } from "../Navbar/Navbar";

interface iProps {
  opened?: boolean;
}

export function HeaderTabs({ opened }: iProps) {
  const { user,  } = useUser();

  return (
    <div
      className={classes.header}
      style={{ paddingLeft: opened ? "30px" : "30px" }}
    >
        <Group justify="space-between">
          <Link href="/dashboard">
            <Image
              h={user?.orgLogo ? 80 : 80}
              src={
                user?.orgLogo && user?.orgLogo !== "REMOVED_PHOTO"
                  ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.orgLogo}`
                  : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup_logo.svg`
              }
            />
          </Link>
        </Group>

        <Space h="lg" />
           <Navbar />
    </div>
  );
}
