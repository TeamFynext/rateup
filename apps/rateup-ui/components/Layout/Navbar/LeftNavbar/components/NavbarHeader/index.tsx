import { ActionIcon, Avatar, Box, Group, Text } from "@mantine/core";
import { IconChevronLeft, IconMenu2 } from "@tabler/icons-react";
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
        {props.opened && (
          <div style={{ flex: 1 }}>
            <Text size="sm" c="var(--mantine-color-gray-6)">
              {props?.orgName}
            </Text>
          </div>
        )}
        <ActionIcon
          className={cx("chevron-burger-btn", {
            "navbar-closed": !props.opened,
          })}
          onClick={() => {
            props?.setOpened((o) => !o);
          }}
        >
          {props.opened ? <IconChevronLeft /> : <IconMenu2 />}
        </ActionIcon>
      </Group>
    </Box>
  );
};

export default NavbarHeader;
