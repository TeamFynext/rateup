import React, { useState, useEffect } from "react";
import {
  Stack,
  Burger,
  NavLink,
  Tooltip,
  Divider,
  ScrollArea,
  Anchor,
  Box,
  useMantineColorScheme,
} from "@mantine/core";
import { useRouter } from "next/router";
import { useMediaQuery } from "@mantine/hooks";
import { useUser } from "../../../context/UserContext";
import styles from "./Navbar.module.css";
import { NavbarLinkProps, getNavTopData } from "./navbar.constants";
import { UserRole } from "../../../utils/enums";
import { useSubscription } from "../../../backend/subscription/subscription.query";
import ExpiryComponent from "../../Premium/ExpiryComponent";
import NavbarHeader from "./NavbarHeader";
import NavbarFooter from "./NavbarFooter";
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
  const { colorScheme } = useMantineColorScheme();
  const colorBasedOnLightMode = colorScheme === "light" ? "gray" : "white";
  return (
    <>
      {data.map(({ Icon, label, href, role, submenus }, parentIndex) => {
        if (role && currentRole !== role) return null;
        return (
          <Tooltip
            label={!opened ? label : ""}
            position="right"
            styles={{ tooltip: { display: opened && "none" } }}
            key={parentIndex}
          >
            <NavLink
              mt={5}
              styles={{
                children: { display: !opened && "none", marginTop: 5 },
                root: {
                  borderRadius: 5,
                },
                label: {
                  color:
                    !(
                      (submenus?.length > 0 && active === parentIndex) ||
                      router.pathname === href
                    ) && colorBasedOnLightMode,
                },
                chevron: {
                  color:
                    !(
                      (submenus?.length > 0 && active === parentIndex) ||
                      router.pathname === href
                    ) && colorBasedOnLightMode,
                },
              }}
              p={5}
              label={opened && label}
              leftSection={
                <Icon
                  size={21}
                  color={
                    !(
                      (submenus?.length > 0 && active === parentIndex) ||
                      router.pathname === href
                    )
                      ? "grey"
                      : "var(--tertiary-color)"
                  }
                />
              }
              rightSection={!opened && <Burger opened={opened} size={0} />}
              active={
                submenus?.length > 0
                  ? active === parentIndex
                  : router.pathname === href
              }
              onClick={(e) => {
                if (href) {
                  if (label == "Docs") {
                    window.open(href, "_blank");
                  } else {
                    router.push(href);
                  }
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
                      if (role && currentRole !== role) return null;
                      return (
                        <React.Fragment key={index}>
                          <Tooltip
                            label={!opened ? label : ""}
                            position="right"
                            styles={{ tooltip: { display: opened && "none" } }}
                          >
                            <NavLink
                              styles={{
                                children: { display: !opened && "none" },
                                root: {
                                  borderRadius: 5,
                                },
                                label: {
                                  color: router.pathname !== href && "gray",
                                },
                              }}
                              p={5}
                              label={opened && label}
                              leftSection={
                                <Icon
                                  size={18}
                                  color={
                                    router.pathname !== href
                                      ? "grey"
                                      : "var(--tertiary-color)"
                                  }
                                />
                              }
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
  const [active, setActive] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { user } = useUser();
  const [userProfileAvatar, setUserProfileAvatar] = useState(
    `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/user.png`,
  );
  useEffect(() => {
    if (user?.profilePhoto && user?.profilePhoto !== "REMOVED_PHOTO") {
      const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user?.profilePhoto}`;
      setUserProfileAvatar(imgUrl);
    } else {
      setUserProfileAvatar(
        `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/profile-photo.png`,
      );
    }
  }, [user]);

  const handlePaperLayoutClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
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
    role: !user?.role ? "...error..." : user?.role,
    image: userProfileAvatar,
  };

  const { data: subscription, isPending } = useSubscription();

  if (isPending) return null;
  const navTopData = getNavTopData(subscription);

  return (
    <Stack
      className={styles["navbar"]}
      gap={0}
      style={style}
      w={"100%"}
      h={"100%"}
      miw={opened ? (isMobile ? 360 : 250) : 70}
      maw={opened ? (isMobile ? 360 : 250) : 70}
    >
      <header>
        <NavbarHeader {...user} {...{ opened, setOpened }} />
      </header>
      <Divider />
      <ScrollArea
        mt={"xs"}
        mb={20}
        p={"lg"}
        h={"100%"}
        scrollbarSize={2}
        offsetScrollbars
        styles={{
          scrollbar: {
            opacity: 0.3,
          },
        }}
      >
        <_NavbarLink
          data={navTopData}
          opened={opened}
          currentRole={userInfo.role}
          setOpened={setOpened}
          active={active}
          setActive={setActive}
        />

        <ExpiryComponent expiryDate={subscription?.expiresAt}>
          <Tooltip
            label={!opened ? "Buy Rateup Premium" : ""}
            position="right"
            styles={{ tooltip: { display: opened && "none" } }}
          >
            <Box mt="sm" ml="1px">
              <Anchor href="/dashboard/settings?activeTab=account">
                <img
                  src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/${
                    opened ? "rateup-pro-ad.png" : "premium-icon.svg"
                  }`}
                  alt=""
                  height={opened ? 180 : 20}
                />
              </Anchor>
            </Box>
          </Tooltip>
        </ExpiryComponent>
      </ScrollArea>
      <Divider />
      <footer className={styles.navbarfooter}>
        <NavbarFooter {...user} {...{ opened, setOpened }} />
      </footer>
    </Stack>
  );
};

export default LeftNavbar;

export interface UserCardInterface extends UserData {
  opened: boolean;
  setOpened: React.Dispatch<React.SetStateAction<boolean>>;
}
