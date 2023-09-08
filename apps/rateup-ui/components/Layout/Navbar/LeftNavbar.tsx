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
  useMantineTheme, Text, Group
} from "@mantine/core";
import {
  IconDeviceDesktopAnalytics,
  IconSettings,
  IconLogout,
  IconUsers,
  IconCheckupList,
  IconSocial,
  IconSpeakerphone,
  IconPageBreak,
  IconClipboardList
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMediaQuery } from '@mantine/hooks';
import { useUser } from '../../../context/UserContext';

const useStyles = createStyles((theme) => ({
  iconlink: {
    width: rem(50),
    height: rem(50),
    borderRadius: theme.radius.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // transition: "background-color 0.3s ease",
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

  iconLabellink: {
    height: rem(50),
    borderRadius: theme.radius.md,
    // transition: "background-color 0.3s ease",
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

  navbar: {
    transition: "width 0.3s ease"
  },
  submenuLink: {
    paddingLeft: theme.spacing.md,
  },

}));

interface NavbarLinkProps {
  icon: React.FC<any>;
  label: string;
  href: string;
  opened: boolean;
  submenus?:  NavbarLinkProps[];
  role?: string;
}

function NavbarLink({ icon: Icon, label, href , opened, submenus, role}: NavbarLinkProps) {
  const router = useRouter();
  const { classes, cx } = useStyles();
  const { user, setUser } = useUser();

  const isSubmenuActive = (submenus) => {
    return submenus?.some((submenu) => router.asPath === submenu.href) || false;
  };
  
  const isActive = router.asPath === href || isSubmenuActive(submenus);
const [submenuOpen, setSubmenuOpen] = useState(isActive);

  const handleSubmenuClick = () => {
    setSubmenuOpen(!submenuOpen);
  };

  const handleMouseEnter = () => {
    setSubmenuOpen(true);
  }

  const handleMouseLeave = () => {
    setSubmenuOpen(false);
  }

  if (role && user?.role !== role) {
    return null;
  }

  return (
    <> 
    {
    
    opened ? 
    <span           onMouseEnter={submenus ? handleMouseEnter : undefined}
    onMouseLeave={submenus ? handleMouseLeave : undefined} >
    <Link href={href} passHref>
        <UnstyledButton
          className={cx(classes.iconLabellink, { [classes.active]: isActive })}
        >
          <Group pl="sm" sx={{minWidth:"230px"}}>
            <Icon size="1.2rem" stroke={1.5} />
            <Text fz="md" >{label}</Text>
          </Group>
         
        </UnstyledButton>
        
      </Link>
      {Array.isArray(submenus) && submenuOpen && submenus.map(submenu => 
            <Group className={cx(classes.submenuLink)}>
              <NavbarLink 
                opened={opened} 
                {...submenu} 
                key={submenu.label} 
                //onClick={() => setSubmenuOpen(false)}
              />
            </Group>
          )}
      </span>
    
  :
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <Link href={href} passHref>
        <UnstyledButton
          className={cx(classes.iconlink, { [classes.active]: isActive })}
        >
          <Icon size="1.2rem" stroke={1.5} />
        </UnstyledButton>
      </Link>
    </Tooltip>
  }
    </>
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
  { icon: DashBoardIcon, label: 'Dashboard', href: '/dashboard', role:'' },
  { icon: IconSocial, label: 'Teams', href: '', submenus: [
    { icon: IconSocial, label: 'All Teams', href: '/dashboard/teams' },
    { icon: IconUsers, label: 'All Members', href: '/dashboard/members', role: 'SUPER_ADMIN' },
  ]  },
  { icon: IconCheckupList, label: 'Surveys', href: '',
  submenus: [
    { icon: IconSocial, label: 'Web Survey', href: '/dashboard/surveys' },
    { icon: WhasappSurveyIcon, label: 'WhatsApp Survey', href: '/dashboard/whatsappsurvey' },
    { icon: IconPageBreak, label: 'Merge Surveys', href: '/dashboard/LandingPages' }
  ] },
  { icon: IconDeviceDesktopAnalytics, label: 'Testinomials', href: '/dashboard/' },
  { icon: IconSpeakerphone, label: "Promotion", href: '/dashboard/promotion'},
  { icon: IconPageBreak, label: "Merge Survey", href: '/dashboard/LandingPages'},
  {icon: IconClipboardList, label: "Menu", href: '/dashboard/menu'}
];

const LeftNavbar = () => {
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();
  const isLargerThanSm = useMediaQuery("(min-width: 768px)");
  const { user, setUser } = useUser();
  const { classes, cx } = useStyles();


  const links = mockdata.map((link) => {

    const submenusWithOpened = link.submenus?.map((submenu) => ({
      ...submenu,
      opened: opened,
    }));

    if (link?.role) {
      if (user?.role === link?.role) {
        return <NavbarLink opened={opened} {...link} key={link.label}           submenus={submenusWithOpened}
        />;
      }
    } else {
      return <NavbarLink  opened={opened} {...link} key={link.label}           submenus={submenusWithOpened}
      />;
    }
  });

  const handleMouseLeave = () => {
    setOpened(false);
  }

  const handleMouseEnter = () => {
    setOpened(true);
  }



  return (
    <>
<Navbar width={{ base: opened ? 260 : 90 }} p="md"  className={classes.navbar}
onMouseEnter={handleMouseEnter}
 onMouseLeave={handleMouseLeave}>
  <Group position={opened ? "apart" : "center"} mt={25}>
  {
  opened &&  <Link href="/dashboard">
            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
             alt="RateUp Logo" width={130} height={30}  ml="sm"/>
          </Link>
        }

          {
  !opened &&   
  <Center >
   
        <Burger
          opened={opened}
          onClick={() => {
            setOpened((o) => !o)
          }}
          size="sm"
          color={theme.colors.gray[6]}
        />      </Center>

}

          </Group>
       
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
            opened={opened}
            icon={IconSettings}
            label="Settings"
            href="/dashboard/settings/account"
          />
          <NavbarLink opened={opened} icon={IconLogout} label="Logout" href="/logout" />
        </Stack>
      </Navbar.Section>
    </Navbar>
    </>
  );
};

export default LeftNavbar;
