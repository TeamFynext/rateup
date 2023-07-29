import { useState } from "react";
import {
  Navbar,
  Image,
  Center,
  Tooltip,
  UnstyledButton,
  createStyles,
  Stack,
  rem,
  Burger,
  useMantineTheme,
} from "@mantine/core";
import {
  IconDeviceDesktopAnalytics,
  IconSettings,
  IconLogout,
  IconUsers,
  IconCheckupList,
  IconSocial,
  IconUsersGroup,
  IconClipboardData
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMediaQuery } from "@mantine/hooks";
import { useUser } from "../../../context/UserContext";

const useStyles = createStyles((theme) => ({
  link: {
    width: rem(50),
    height: rem(50),
    borderRadius: theme.radius.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[0],
    },
  },

  active: {
    "&, &:hover": {
      backgroundColor: theme.fn.variant({
        variant: "light",
        color: theme.primaryColor,
      }).background,
      color: theme.fn.variant({ variant: "light", color: theme.primaryColor })
        .color,
    },
  },
}));

interface NavbarLinkProps {
  icon: React.FC<any>;
  label: string;
  href: string;
}

function NavbarLink({ icon: Icon, label, href }: NavbarLinkProps) {
  const router = useRouter();
  const isActive = router.asPath === href;
  const { classes, cx } = useStyles();

  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <Link href={href} passHref>
        <UnstyledButton
          className={cx(classes.link, { [classes.active]: isActive })}
        >
          <Icon size="1.2rem" stroke={1.5} />
        </UnstyledButton>
      </Link>
    </Tooltip>
  );
}

export const DashBoardIcon = () => (
  <Image
    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/icons/nav/dashboard.svg`}
    maw={23}
    alt="Dashboard"
  />
);
export const WhasappSurveyIcon = () => (
  <Image
    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/icons/nav/whatsappSurvey.svg`}
    maw={23}
    alt="Dashboard"
  />
);

const mockdata = [
  { icon: DashBoardIcon, label: "Dashboard", href: "/dashboard" },
  { icon: IconSocial, label: "Teams", href: "/dashboard/teams" },
  {
    icon: IconUsers,
    label: "Members",
    href: "/dashboard/members",
    role: "SUPER_ADMIN",
  },
  { icon: IconCheckupList, label: "Surveys", href: "/dashboard/surveys" },
  { icon: IconClipboardData, label: "WhatsApp Survey", href: "/dashboard/whatsappsurvey" },
  {
    icon: IconDeviceDesktopAnalytics,
    label: "Testinomials",
    href: "/dashboard/",
  },
];

const LeftNavbar = () => {
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();
  const isLargerThanSm = useMediaQuery("(min-width: 768px)");
  const { user, setUser } = useUser();

  const links = mockdata.map((link) => {
    if (link?.role) {
      if (user?.role === link?.role) {
        return <NavbarLink {...link} key={link.label} />;
      }
    } else {
      return <NavbarLink {...link} key={link.label} />;
    }
  });

  return (
    <Navbar width={{ base: 90 }} p="md">
      <Center mt={25}>
        <Burger
          opened={opened}
          onClick={() => setOpened((o) => !o)}
          size="sm"
          color={theme.colors.gray[6]}
        />
      </Center>
      {isLargerThanSm && (
        <Navbar.Section grow mt={50}>
          <Stack justify="center" spacing={0}>
            {links}
          </Stack>
        </Navbar.Section>
      )}
      <Navbar.Section>
        <Stack justify="center" spacing={0}>
          <NavbarLink
            icon={IconSettings}
            label="Settings"
            href="/dashboard/settings/account"
          />
          <NavbarLink icon={IconLogout} label="Logout" href="/auth/logout" />
        </Stack>
      </Navbar.Section>
    </Navbar>
  );
};

export default LeftNavbar;
