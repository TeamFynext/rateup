import React, { useState, useEffect } from "react";
import {
  Image,
  Stack,
  Burger,
  useMantineTheme,
  Text,
  Flex,
  Menu,
  Group,
  Avatar,
  NavLink,
  Tooltip,
  Divider,
  ScrollArea,
  Anchor,
  Box,
  Combobox,
} from "@mantine/core";
import LoggedInUserCard from "./LoggedInUserCard";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useRouter } from "next/router";
import { IconChevronLeft } from "@tabler/icons-react";
import { IconChevronUp, IconChevronDown } from "@tabler/icons";
import { useMediaQuery } from "@mantine/hooks";
import { useUser } from "../../../context/UserContext";
import styles from "./Navbar.module.css";
import {
  NavbarLinkProps,
  getNavTopData,
  useNavBottomData,
} from "./navbar.constants";
import { UserRole } from "../../../utils/enums";
import { useSubscription } from "../../../backend/subscription/subscription.query";
import ExpiryComponent from "../../Premium/ExpiryComponent";
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
                    ) && "gray",
                },
                chevron: {
                  color:
                    !(
                      (submenus?.length > 0 && active === parentIndex) ||
                      router.pathname === href
                    ) && "gray",
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
  const theme = useMantineTheme();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const navBottomData = useNavBottomData();
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

  const handleItemClick = (item: NavbarLinkProps) => {
    if (item.label === "Admin") {
      router.push(`/admin`);
    } else if (item.label === "Settings") {
      router.push(`/dashboard/settings`);
    } else if (item.label === "Logout") {
      router.push(`/logout`);
    }
  };

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
      p="lg"
      gap={0}
      style={style}
      w={"100%"}
      h={"100%"}
      miw={opened ? (isMobile ? 360 : 250) : 70}
      maw={opened ? (isMobile ? 360 : 250) : 70}
    >
      {opened ? (
        <Stack align="center" gap={0} pos={"relative"}>
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
          <Group className={styles["icon-and-chevraon-container"]}>
            <Image
              h={user?.orgLogo ? 120 : 120}
              w={user?.orgLogo ? 120 : 120}
              fit="contain"
              src={
                user?.orgLogo && user?.orgLogo !== "REMOVED_PHOTO"
                  ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.orgLogo}`
                  : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup_logo.svg`
              }
            />
            <PaperLayout
              w={"fit-content"}
              p={2}
              hoveractive
              radius={"md"}
              style={{
                justifySelf: "flex-end",
                alignItems: "center",
                justifyContent: "center",
                display: "flex",
              }}
            >
              <IconChevronLeft
                size={25}
                onClick={() => {
                  setOpened((o) => !o);
                }}
                style={{ cursor: "pointer" }}
              />
            </PaperLayout>
          </Group>
        </Stack>
      ) : (
        <>
          <Avatar
            onClick={() => {
              setOpened((o) => !o);
            }}
            style={{ cursor: "pointer" }}
            src={
              user?.orgLogo && user?.orgLogo !== "REMOVED_PHOTO"
                ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.orgLogo}`
                : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup_logo.svg`
            }
            alt={"Organization Name"}
            radius="xl"
            size={30}
            mt={50}
          />
        </>
      )}

      <ScrollArea
        mt={"sm"}
        mb={20}
        p={1}
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
      <Stack gap={10}>
        <Combobox>
          <Menu shadow="md" onClose={() => setIsDropdownOpen(false)}>
            <Menu.Target>
              <Box>
                {opened ? (
                  <PaperLayout
                    p={3}
                    hoveractive
                    left={0}
                    radius={"lg"}
                    onClick={handlePaperLayoutClick}
                  >
                    <Flex
                      justify={"space-between"}
                      className={styles["Logged-in-user-card"]}
                    >
                      <LoggedInUserCard />
                      {isDropdownOpen ? (
                        <IconChevronDown
                          className={styles["user-icon-arrow-circle"]}
                        />
                      ) : (
                        <IconChevronUp
                          className={styles["user-icon-arrow-circle"]}
                        />
                      )}
                    </Flex>
                  </PaperLayout>
                ) : (
                  <Avatar
                    onClick={() => {
                      setOpened((o) => !o);
                    }}
                    src={
                      user?.orgLogo && user?.orgLogo !== "REMOVED_PHOTO"
                        ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.profilePhoto}`
                        : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup_logo.svg`
                    }
                    alt=""
                    radius="xl"
                    size={30}
                    mt={50}
                  />
                )}{" "}
              </Box>
            </Menu.Target>
            <Menu.Dropdown
              className={styles["dropdown-menu"]}
              style={{ width: "190px" }}
            >
              <Menu.Label>Manage your Account</Menu.Label>
              {navBottomData.map((item, index) => (
                <Menu.Item key={index} onClick={() => handleItemClick(item)}>
                  <Flex style={{ marginLeft: "1rem", marginTop: "0.5rem" }}>
                    {item.Icon && (
                      <item.Icon size={21} style={{ color: "grey" }} />
                    )}
                    <Text
                      style={{
                        fontSize: "15px",
                        marginLeft: "1rem",
                        color: "grey",
                      }}
                    >
                      {item.label}
                    </Text>
                  </Flex>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Combobox>
        <img
          src={
            opened
              ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup_logo.svg`
              : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/icons/rateup_new_logo.svg`
          }
          alt=""
          height={opened ? 40 : 20}
        />
      </Stack>
    </Stack>
  );
};

export default LeftNavbar;
