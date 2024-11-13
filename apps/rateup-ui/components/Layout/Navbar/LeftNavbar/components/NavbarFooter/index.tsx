import { useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Divider,
  Group,
  Menu,
  rem,
  Text,
  ThemeIcon,
} from "@mantine/core";

import ColorSchemaButton from "@/components/theme/ColorSchemaButton";
import useTranslations from "@/dictionaries/useTranslation";
import { surveyUploadsPath } from "@/utils/constants";

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
  let isProfilePhotoAvailable =
    props?.profilePhoto && props?.profilePhoto !== "REMOVED_PHOTO";
  return (
    <Box>
      <Box style={{ margin: "auto", marginLeft: "5rem", marginTop: "1px" }}>
        <Text size="sm" c="var(--mantine-color-gray-7">
          {translations["Account"]}
        </Text>
      </Box>

      <Box style={{ margin: "auto", width: "15rem" }}>
        {bottomNavData.map(({ Icon, label, href }, index) => (
          <Group
            key={index}
            onClick={() => handleItemClick(label)}
            ml="1rem"
            mb="10px"
            mt="15px"
            style={{ cursor: "pointer" }}
          >
            <ThemeIcon variant="transparent" size={20}>
              <Icon color="gray" />
            </ThemeIcon>
            <Text
              size="sm"
              fw={500}
              onClick={() => router.push(href)}
              c="var(--mantine-color-gray-7"
            >
              {label}
            </Text>
          </Group>
        ))}
      </Box>
      <Box ml="15px" mt="15px" mb="10px">
        {process.env.NEXT_PUBLIC_EXPERIMENT && <ColorSchemaButton />}
      </Box>
      <Divider />

      <Group>
        <Box
          className={`${styles.user}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Group className={styles.userSection}>
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
            {props.opened ? (
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={500} c="var(--mantine-color-gray-6)">
                  {props?.userName}
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
      </Group>
    </Box>
  );
};
export default NavbarFooter;
