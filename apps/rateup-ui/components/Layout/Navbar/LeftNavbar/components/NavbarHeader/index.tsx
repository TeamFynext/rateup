import { ActionIcon, Avatar, Box, Group, Text } from "@mantine/core";
import { IconChevronLeft, IconMenu2 } from "@tabler/icons-react";
import classNames from "classnames/bind";

import { UserCardInterface } from "../..";
import { surveyUploadsPath } from "../../../../../../utils/constants";
import styles from "./NavbarHeader.module.css";

const cx = classNames.bind(styles);

const NavbarHeader = (props: UserCardInterface) => {
  let isProfilePhotoAvailable =
    props?.profilePhoto && props?.profilePhoto !== "REMOVED_PHOTO";
  return (
    <Box className={styles["avatar-org-name-chevron-burger-btn-container"]}>
      <Group justify="center" wrap="wrap-reverse">
        <Avatar
          src={
            isProfilePhotoAvailable &&
            `${surveyUploadsPath}${props.profilePhoto}`
          }
          radius="xl"
          onClick={() => {
            props.setOpened((o) => true);
          }}
          name={props?.userName}
          color="initials"
        />
        {props.opened && (
          <div style={{ flex: 1 }}>
            <Text size="sm" c="var(--mantine-color-gray-7">
              {props?.userName}
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
