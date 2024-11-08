import { Avatar, Box, Group, Text } from "@mantine/core";
import classNames from "classnames/bind";

import { UserCardInterface } from "../..";
import styles from "./NavbarHeader.module.css";

const cx = classNames.bind(styles);
const NavbarHeader = (props: UserCardInterface) => {
  return (
    <Box className={styles["avatar-org-name-chevron-burger-btn-container"]}>
      <Group justify="center" wrap="wrap-reverse">
        <Avatar
          src={
            props.orgLogo &&
            `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${props.orgLogo}`
          }
          radius="sm"
          style={{ width: "20%", objectFit: "cover", aspectRatio: 1 / 1 }}
          name={props?.orgName}
          color="initials"
        />
        <div style={{ flex: 1 }}>
          <Text size="sm" c="var(--mantine-color-gray-6)">
            {props?.orgName}
          </Text>
        </div>
      </Group>
    </Box>
  );
};

export default NavbarHeader;
