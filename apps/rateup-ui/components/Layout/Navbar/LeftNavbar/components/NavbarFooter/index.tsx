import { useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Group,
  Menu,
  rem,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";

import ColorSchemaButton from "@/components/theme/ColorSchemaButton";
import useTranslations from "@/dictionaries/useTranslation";

import { UserCardInterface } from "../..";
import { UserRole } from "../../../../../../utils/enums";
import { useNavBottomData } from "../../../navbar.constants";
import styles from "./NavbarFooter.module.css";

const NavbarFooter = (props: UserCardInterface) => {
  const router = useRouter();
  const bottomNavData = useNavBottomData();
  const [menuOpen, setMenuOpen] = useState(false);
  const { translations } = useTranslations();
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
        withinPortal
      >
        <Menu.Target>
          <Box
            className={`${styles.user}`}
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ cursor: "pointer" }}
          >
            <Group>
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
              {props.opened ? (
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500} c="var(--mantine-color-gray-7">
                    {props?.orgName}
                  </Text>
                  <Badge variant="light" size="xs">
                    {props?.role === UserRole.SUPADM
                      ? "Super Admin"
                      : props?.role === UserRole.ADM
                        ? "Admin"
                        : "Member"}
                  </Badge>
                </div>
              ) : null}
            </Group>
          </Box>
        </Menu.Target>
        <Menu.Dropdown
          style={{
            width: "15rem",
          }}
        >
          <Menu.Item>
            <Group>
              <Text size="sm" c="var(--mantine-color-gray-7">
                {translations["Account"]}
              </Text>
            </Group>
          </Menu.Item>
          {bottomNavData.map(({ Icon, label, href }, index) => (
            <Menu.Item
              key={index}
              onClick={() => handleItemClick(label)}
              leftSection={
                <ThemeIcon variant="transparent" size={20}>
                  <Icon color="gray" />
                </ThemeIcon>
              }
            >
              <Text
                size="sm"
                fw={500}
                onClick={() => router.push(href)}
                c="var(--mantine-color-gray-7"
              >
                {label}
              </Text>
            </Menu.Item>
          ))}
          <Menu.Item>
            {process.env.NEXT_PUBLIC_EXPERIMENT && <ColorSchemaButton />}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
};
export default NavbarFooter;
