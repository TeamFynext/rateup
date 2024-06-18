import { useRouter } from "next/router";
import { useState } from "react";
import { UserCardInterface } from "./LeftNavbar";
import { useNavBottomData } from "./navbar.constants";
import styles from "./Navbar.module.css";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Group,
  Menu,
  UnstyledButton,
  MenuTarget,
  Text,
  ThemeIcon,
  rem,
} from "@mantine/core";
import { UserRole } from "../../../utils/enums";
import { IconChevronRight } from "@tabler/icons-react";
import { surveyUploadsPath } from "../../../utils/constants";
const NavbarFooter = (props: UserCardInterface) => {
  const router = useRouter();
  const bottomNavData = useNavBottomData();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleItemClick = (label: string) => {
    if (label === "Admin") {
      router.push(`/admin`);
    } else if (label === "Settings") {
      router.push(`/dashboard/settings`);
    } else if (label === "Logout") {
      router.push(`/logout`);
    }
  };
  return (
    <Group>
      <Menu
        onClose={() => setMenuOpen(false)}
        position="top-start"
        shadow="xs"
        offset={20}
      >
        <Box
          className={`${styles.user}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Group>
            <Avatar
              src={`${surveyUploadsPath}${props.profilePhoto}`}
              radius="xl"
              onClick={() => {
                props.setOpened((o) => true);
              }}
            />
            {props.opened ? (
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                  {props?.userName}
                </Text>
                <Badge variant="light" size="xs">
                  {props?.role === UserRole.SUPADM
                    ? "Super Admin"
                    : props?.role === UserRole.ADM
                      ? "Admin"
                      : "Member"}
                </Badge>

                <Menu.Target>
                  <ActionIcon
                    variant="light"
                    style={{ marginBottom: "1rem", marginLeft: "3rem" }}
                  >
                    <IconChevronRight
                      style={{ width: rem(14), height: rem(14) }}
                      stroke={2}
                    />
                  </ActionIcon>
                </Menu.Target>
              </div>
            ) : null}
          </Group>
        </Box>
        <Menu.Dropdown>
          <Menu.Item>
            <Group>
              <Avatar
                src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${props.profilePhoto}`}
                radius="xl"
              />
              <div style={{ flex: 1 }}>
                <Text size="xs" fw={500}>
                  {props?.userName}
                </Text>
                <Text c="dimmed" fz={10}>
                  {props?.email}
                </Text>
              </div>
            </Group>
          </Menu.Item>
          <Menu.Divider />
          {bottomNavData.map(({ Icon, label, href }, index) => (
            <Menu.Item
              key={index}
              onClick={() => handleItemClick(label)}
              leftSection={
                <ThemeIcon variant="transparent" size={20}>
                  <Icon />
                </ThemeIcon>
              }
            >
              <Text size="xs" fw={500} onClick={() => router.push(href)}>
                {label}
              </Text>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
};
export default NavbarFooter;
