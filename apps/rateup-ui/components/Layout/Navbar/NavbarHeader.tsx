import {
  ActionIcon,
  Avatar,
  Box,
  Group,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronLeft, IconMenu2 } from "@tabler/icons-react";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { UserCardInterface } from "./LeftNavbar";

import classNames from "classnames/bind";
import styles from "./Navbar.module.css";
const cx = classNames.bind(styles);

const NavbarHeader = (props: UserCardInterface) => {
  return (
    <Box className={styles["avatar-org-name-chevron-burger-btn-container"]}>
      <Group justify="center" wrap="wrap-reverse">
        <Avatar
          src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${props.orgLogo}`}
          radius="sm"
          style={{ width: "20%", height: "20%", objectFit: "cover" }}
        />
        {props.opened && (
          <div style={{ flex: 1 }}>
            <Text size="sm" fw={500}>
              {props?.orgName}
            </Text>
          </div>
        )}
        <ActionIcon
          className={cx("chevron-burger-btn", {
            "navbar-closed": !props.opened,
          })}
        >
          {props.opened ? (
            <IconChevronLeft
              onClick={() => {
                props?.setOpened((o) => !o);
              }}
            />
          ) : (
            <IconMenu2
              onClick={() => {
                props?.setOpened((o) => !o);
              }}
            />
          )}
        </ActionIcon>
      </Group>
    </Box>
  );
};

export default NavbarHeader;
