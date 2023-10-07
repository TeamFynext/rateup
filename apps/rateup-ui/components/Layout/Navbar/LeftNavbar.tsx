import { useState, useEffect } from "react";
import {
  Image,
  Tooltip,
  UnstyledButton,
  Stack,
  Burger,
  useMantineTheme,
  Text,
  Group,
  Flex,
  Menu,
  Center,
  Paper,
  Avatar,
} from "@mantine/core";
import {
  IconSettings,
  IconLogout,
  IconUsers,
  IconSocial,
  IconSpeakerphone,
  IconPageBreak,
  IconClipboardList,
  IconChevronDown,
  IconBrowser,
  IconMessage2Code,
  IconBrandWhatsapp,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useMediaQuery } from "@mantine/hooks";
import { useUser } from "../../../context/UserContext";
import classes from "./Navbar.module.css";
import { IconChevronUp } from "@tabler/icons-react";
import cx from "clsx";

// TODO: format
interface NavbarLinkProps {
  icon: React.FC<any>;
  label: string;
  href?: string;
  opened: boolean;
  submenus?: NavbarLinkProps[];
  role?: string;
  setOpened?: React.Dispatch<React.SetStateAction<boolean>>;
}

function NavbarLink({
  icon: Icon,
  label,
  href,
  opened,
  submenus,
  role,
  setOpened,
}: NavbarLinkProps) {
  const router = useRouter();
  const { user } = useUser();

  const isSubmenuActive = (submenus) => {
    return submenus?.some((submenu) => router.asPath === submenu.href) || false;
  };

  const isActive = router.asPath === href || isSubmenuActive(submenus);
  const [submenuOpen, setSubmenuOpen] = useState(isActive);

  const handleMenuClick = () => {
    if (submenus) {
      setSubmenuOpen(!submenuOpen);
      !opened && submenus && router.push(submenus[0].href);
      !opened && submenus && setOpened(true);
    } else {
      router.push(href);
    }
  };

  if (role && user?.role !== role) {
    return null;
  }

  const transitionClasses = {
    transition: "all 0.8s ease",
  };

  return (
    <span style={opened ? transitionClasses : {}}>
      {opened ? (
        <span>
          <UnstyledButton
            className={cx(
              classes.iconLabellink,
              { [classes.active]: isActive && submenus },
              { [classes.submenuActive]: isActive && !submenus },
            )}
            onClick={handleMenuClick}
          >
            <Group
              px="sm"
              style={{ minWidth: "230px" }}
              justify="space-between"
            >
              <Group>
                <Icon size="1.2rem" stroke={1.5} />
                <Text fz="md">{label}</Text>
              </Group>
              {submenus &&
                (submenuOpen ? <IconChevronUp /> : <IconChevronDown />)}
            </Group>
          </UnstyledButton>

          {Array.isArray(submenus) &&
            submenuOpen &&
            submenus.map((submenu) => (
              <Group className={cx(classes.submenuLink)}>
                <NavbarLink
                  opened={opened}
                  {...submenu}
                  key={submenu.label}
                  //onClick={() => setSubmenuOpen(false)}
                />
              </Group>
            ))}
        </span>
      ) : (
        <Tooltip label={label} position="right">
          <UnstyledButton
            className={cx(classes.iconlink, { [classes.active]: isActive })}
            onClick={handleMenuClick}
          >
            <Icon size="1.2rem" stroke={1.5} />
          </UnstyledButton>
        </Tooltip>
      )}
    </span>
  );
}

export const DashBoardIcon = () => (
  <Image
    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/icons/nav/dashboard.svg`}
    alt="Dashboard"
    style={{
      width: "20px",
      height: "20px",
    }}
  />
);
export const WhasappSurveyIcon = () => (
  <Image
    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/icons/nav/whatsappSurvey.svg`}
    color="black"
    alt="Dashboard"
    style={{
      width: "20px",
      height: "20px",
    }}
  />
);

const mockdata = [
  { icon: DashBoardIcon, label: "Dashboard", href: "/dashboard", role: "" },
  {
    icon: IconSocial,
    label: "Teams",
    href: "",
    submenus: [
      { icon: IconSocial, label: "All Teams", href: "/dashboard/teams" },
      {
        icon: IconUsers,
        label: "All Members",
        href: "/dashboard/members",
        role: "SUPER_ADMIN",
      },
    ],
  },
  {
    icon: IconBrowser,
    label: "Surveys",
    href: "",
    submenus: [
      {
        icon: IconClipboardList,
        label: "All Surveys",
        href: "/dashboard/surveys",
      },
      {
        icon: IconPageBreak,
        label: "Merge Surveys",
        href: "/dashboard/LandingPages",
      },
    ],
  },
  // { icon: IconDeviceDesktopAnalytics, label: 'Testimonials', href: '/dashboard/' },
  {
    icon: IconBrandWhatsapp,
    label: "WhatsApp",
    submenus: [
      {
        icon: WhasappSurveyIcon,
        label: "Survey",
        href: "/dashboard/whatsapp/surveys",
      },
      {
        icon: IconSpeakerphone,
        label: "Promotion",
        href: "/dashboard/whatsapp/promotion",
      },
      {
        icon: IconMessage2Code,
        label: "Templates",
        href: "/dashboard/whatsapp/templates",
      },
      {
        icon: IconSettings,
        label: "Settings",
        href: "/dashboard/whatsapp/settings",
      },
    ],
  },
  { icon: IconClipboardList, label: "Menu", href: "/dashboard/menu" },
];

interface iProps {
  opened: boolean;
  setOpened: React.Dispatch<React.SetStateAction<boolean>>;
}

const LeftNavbar = ({ opened, setOpened }: iProps) => {
  const theme = useMantineTheme();
  const isLargerThanSm = useMediaQuery("(min-width: 768px)");
  const { user, setUser } = useUser();
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

  const userInfo = {
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

  const links = mockdata.map((link) => {
    const submenusWithOpened = link.submenus?.map((submenu) => ({
      ...submenu,
      opened: opened,
    }));

    if (link?.role) {
      if (user?.role === link?.role) {
        return (
          <NavbarLink
            opened={opened}
            setOpened={setOpened}
            {...link}
            key={link.label}
            submenus={submenusWithOpened}
          />
        );
      }
    } else {
      return (
        <NavbarLink
          opened={opened}
          setOpened={setOpened}
          {...link}
          key={link.label}
          submenus={submenusWithOpened}
        />
      );
    }
  });

  const handleMouseLeave = () => {
    setOpened(false);
  };

  const handleMouseEnter = () => {
    setOpened(true);
  };

  return (
    <Flex className={classes.navbar} direction={"column"} p="md">
      <Stack justify={opened ? "space-between" : "center"} mt={25}>
        <Center>
          <Burger
            opened={opened}
            onClick={() => {
              setOpened((o) => !o);
            }}
            size="sm"
            color={theme.colors.gray[6]}
          />
        </Center>
        {opened ? (
          <Menu
            width={260}
            position="bottom-end"
            transitionProps={{ transition: "pop-top-right" }}
            withinPortal
          >
            <Menu.Target>
              <Paper
                shadow="sm"
                radius="lg"
                py="sm"
                px="sm"
                style={{ maxWidth: "220px" }}
                className={cx(classes.user)}
              >
                <Group style={{ minWidth: "150px" }}>
                  <Avatar
                    onClick={() => {
                      setOpened((o) => !o);
                    }}
                    src={userInfo?.image}
                    alt={userInfo.name}
                    radius="xl"
                    size={30}
                  />

                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500} style={{ lineHeight: 1 }} mr={6}>
                      {userInfo.name ? userInfo.name : userInfo.email}
                    </Text>

                    <Text c="dimmed" size="xs">
                      {userInfo.role}
                    </Text>
                  </div>
                </Group>
              </Paper>
            </Menu.Target>
          </Menu>
        ) : (
          <Center>
            <Avatar
              onClick={() => {
                setOpened((o) => !o);
              }}
              style={{ cursor: "pointer" }}
              src={userInfo?.image}
              alt={userInfo.name}
              radius="xl"
              size={30}
              mt="sm"
            />
          </Center>
        )}
      </Stack>
      {isLargerThanSm && (
        <Stack justify="space-between" style={{ height: "100%" }}>
          <Stack mt={50} justify="center" gap={0}>
            {links}
          </Stack>
          <Stack justify="center" gap={0}>
            <NavbarLink
              opened={opened}
              icon={IconSettings}
              label="Settings"
              href="/dashboard/settings/user"
            />
            <NavbarLink
              opened={opened}
              icon={IconLogout}
              label="Logout"
              href="/logout"
            />
          </Stack>
        </Stack>
      )}
    </Flex>
  );
};

export default LeftNavbar;
