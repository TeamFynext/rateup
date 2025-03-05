import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import {
  Avatar,
  Badge,
  Box,
  Divider,
  Group,
  NavLink,
  Text,
  useMantineColorScheme,
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
  const { colorScheme } = useMantineColorScheme();
  const colorBasedOnLightMode = colorScheme === "light" ? "gray" : "white";
  const { translations } = useTranslations();
  let isProfilePhotoAvailable =
    props?.profilePhoto && props?.profilePhoto !== "REMOVED_PHOTO";
  return (
    <Box>
      {props.opened && (
        <Box style={{ margin: "auto", marginLeft: "5rem", marginTop: "1px" }}>
          <Text size="sm" c="var(--mantine-color-gray-7">
            {translations["Account"]}
          </Text>
        </Box>
      )}
      <Box style={{ margin: "auto", width: "15rem" }}>
        {bottomNavData.map(({ Icon, label, href }, index) => (
          <NavLink
            ml="lg"
            p={5}
            key={index}
            href={href ?? "/"}
            component={Link}
            label={props.opened && label}
            leftSection={<Icon color="gray" size={21} />}
            styles={{
              children: { display: !props.opened && "none", marginTop: 5 },
              root: {
                borderRadius: 5,
              },
              label: {
                color:
                  !(props.active || router.pathname === href) &&
                  colorBasedOnLightMode,
              },
              chevron: {
                color: !(router.pathname === href) && colorBasedOnLightMode,
              },
            }}
          />
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
                      : "Staff"}
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
