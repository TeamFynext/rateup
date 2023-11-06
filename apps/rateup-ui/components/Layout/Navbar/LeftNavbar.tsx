import React, { useState, useEffect } from "react";
import {
  Image,
  Stack,
  Burger,
  useMantineTheme,
  Text,
  Group,
  Avatar,
  NavLink,
  Tooltip,
  Divider,
} from "@mantine/core";
import { useRouter } from "next/router";
import { useMediaQuery } from "@mantine/hooks";
import { useUser } from "../../../context/UserContext";
import classes from "./Navbar.module.css";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { NavbarLinkProps, navBottomData, navTopData } from "./navbar.constants";
import { UserRole } from "../../../utils/enums";
interface _NavbarLinkProps {
  data: Array<NavbarLinkProps>;
  opened: boolean;
  currentRole:
    | typeof UserRole.ADM
    | typeof UserRole.MEMBER
    | typeof UserRole.SUPADM
    | "...error...";
  setOpened?: React.Dispatch<React.SetStateAction<boolean>>;
  active: number;
  setActive?: React.Dispatch<React.SetStateAction<number>>;
}
function _NavbarLink({
  data,
  opened,
  currentRole,
  setOpened,
  active,
  setActive,
}: _NavbarLinkProps) {
  const router = useRouter();
  const roleArray = [UserRole.SUPADM, UserRole.ADM, UserRole.MEMBER];
  return (
    <>
      {data.map(({ Icon, label, href, role, submenus }, parentIndex) => {
        if (role && currentRole !== role && !roleArray.includes(role))
          return null;
        return (
          <Tooltip
            label={!opened ? label : ""}
            position="right"
            styles={{ tooltip: { display: opened && "none" } }}
            key={parentIndex}
          >
            <NavLink
              styles={{
                children: { display: !opened && "none" },
                root: {
                  borderRadius: 5,
                },
              }}
              p={5}
              label={opened && label}
              leftSection={<Icon size={18} />}
              rightSection={!opened && <Burger opened={opened} size={0} />}
              active={
                submenus?.length > 0
                  ? active === parentIndex
                  : router.pathname === href
              }
              onClick={(e) => {
                if (href) {
                  router.push(href);
                  setActive(parentIndex);
                } else if (submenus?.length > 0) {
                  if (!opened) {
                    if (router.pathname !== submenus[0].href) {
                      router.push(submenus[0].href);
                    }
                    setOpened((o) => true);
                    setActive(parentIndex);
                  }
                }
              }}
              children={
                submenus?.length > 0
                  ? submenus.map(({ Icon, label, href, role }, index) => {
                      if (
                        role &&
                        currentRole !== role &&
                        !roleArray.includes(role)
                      )
                        return null;
                      return (
                        <React.Fragment key={index}>
                          <Tooltip label={label} position="right">
                            <NavLink
                              styles={{
                                children: { display: !opened && "none" },
                                root: {
                                  borderRadius: 5,
                                },
                              }}
                              p={5}
                              label={opened && label}
                              leftSection={<Icon size={18} />}
                              onClick={() => {
                                href && router.push(href);
                                setActive(parentIndex);
                              }}
                              active={router.pathname === href}
                            />
                          </Tooltip>
                          <Divider opacity={0.5} />
                        </React.Fragment>
                      );
                    })
                  : null
              }
            />
          </Tooltip>
        );
      })}
    </>
  );
}
interface iProps {
  opened: boolean;
  setOpened: React.Dispatch<React.SetStateAction<boolean>>;
  style?: any;
}

const LeftNavbar = ({ opened, setOpened, style }: iProps) => {
  const theme = useMantineTheme();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const isLargerThanSm = useMediaQuery("(min-width: 768px)");
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { user } = useUser();
  const [userProfileAvatar, setUserProfileAvatar] = useState(
    `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/user.png`,
  );

  useEffect(() => {
    if (user?.profilePhoto && user?.profilePhoto !== "REMOVED_PHOTO") {
      const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user?.profilePhoto}`;
      setUserProfileAvatar(imgUrl);
    } else {
      setUserProfileAvatar(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/profile-photo.png`,
      );
    }
  }, [user]);

  const userInfo: {
    name: string;
    email: string;
    role:
      | typeof UserRole.ADM
      | typeof UserRole.MEMBER
      | typeof UserRole.SUPADM
      | "...error...";
    image: string;
  } = {
    name: user?.userName,
    email: user?.email,
    role: !user?.role
      ? "...error..."
      : user?.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user?.role === "ADMIN"
      ? "Admin"
      : "Team Member",
    image: userProfileAvatar,
  };
  return (
    <Stack
      className={classes.navbar}
      p="lg"
      gap={0}
      style={style}
      w={"100%"}
      h={"100%"}
      maw={opened ? (isMobile ? 360 : 250) : 70}
    >
      {opened ? (
        <Stack align="center" gap={0}>
          {isMobile && (
            <Burger
              opened={opened}
              onClick={() => {
                setOpened((o) => !o);
              }}
              size="sm"
              mb="sm"
              color={theme.colors.gray[6]}
            />
          )}
          <PaperLayout w="fit-content" p={5}>
            <Image
              radius={10}
              onClick={() => router.replace("/dashboard")}
              h={user?.orgLogo ? 70 : 70}
              w={user?.orgLogo ? 110 : 110}
              src={
                user?.orgLogo && user?.orgLogo !== "REMOVED_PHOTO"
                  ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.orgLogo}`
                  : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup_logo.svg`
              }
            />
          </PaperLayout>
          <PaperLayout mt={10} w="100%">
            <Group gap={5} justify="space-between">
              <Avatar
                onClick={() => {
                  setOpened((o) => !o);
                }}
                src={userInfo?.image}
                alt={userInfo.name}
                radius="xl"
                size={30}
              />
              <Stack gap={0}>
                <Text size="sm" fw={500}>
                  {userInfo.name ? userInfo.name : userInfo.email}
                </Text>
                <Text c="dimmed" size="xs">
                  {userInfo.role}
                </Text>
              </Stack>
              {!isMobile && (
                <Burger
                  opened={opened}
                  onClick={() => {
                    setOpened((o) => !o);
                  }}
                  size="xs"
                  color={theme.colors.gray[6]}
                />
              )}
            </Group>
          </PaperLayout>
        </Stack>
      ) : (
        <>
          <Burger
            opened={opened}
            onClick={() => {
              setOpened((o) => !o);
            }}
            size="sm"
            color={theme.colors.gray[6]}
          />
          <Avatar
            onClick={() => {
              setOpened((o) => !o);
            }}
            style={{ cursor: "pointer" }}
            src={userInfo?.image}
            alt={userInfo.name}
            radius="xl"
            size={30}
            mt={50}
          />
        </>
      )}

      <Stack
        mt={40}
        w={"100%"}
        justify="space-between"
        style={{ flex: 1, overflow: "auto" }}
      >
        <Stack p={1} h={"100%"} style={{ overflow: "auto" }}>
          <_NavbarLink
            data={navTopData}
            opened={opened}
            currentRole={userInfo.role}
            setOpened={setOpened}
            active={active}
            setActive={setActive}
          />
        </Stack>
        <Stack gap={10}>
          <_NavbarLink
            data={navBottomData}
            opened={opened}
            currentRole={userInfo.role}
            setOpened={setOpened}
            active={active}
            setActive={setActive}
          />
          <img
            src={
              opened
                ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup_logo.svg`
                : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/icons/rateup_new_logo.svg`
            }
            alt=""
            height={opened ? 40 : 20}
          />
        </Stack>
      </Stack>
    </Stack>
  );
};

export default LeftNavbar;
