import { useState } from "react";
import {
  Navbar,
  Image,
  Center,
  Tooltip,
  UnstyledButton,
  Stack,
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
  IconClipboardList,
  IconChevronDown
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMediaQuery } from '@mantine/hooks';
import { useUser } from '../../../context/UserContext';
import { useLeftNavStyles } from "./Navbar.styles";
import { IconChevronUp } from "@tabler/icons-react";

interface NavbarLinkProps {
  icon: React.FC<any>;
  label: string;
  href: string;
  opened: boolean;
  submenus?:  NavbarLinkProps[];
  role?: string;
  setOpened? : React.Dispatch<React.SetStateAction<boolean>>
}

function NavbarLink({ icon: Icon, label, href , opened, submenus, role, setOpened}: NavbarLinkProps) {
  const router = useRouter();
  const { classes, cx } = useLeftNavStyles();
  const { user } = useUser();

  const isSubmenuActive = (submenus) => {
    return submenus?.some((submenu) => router.asPath === submenu.href) || false;
  };
  
  const isActive = router.asPath === href || isSubmenuActive(submenus);
  const [submenuOpen, setSubmenuOpen] = useState(isActive);

  const handleMenuClick = () => {
    if(submenus){
      setSubmenuOpen(!submenuOpen)
      !opened && submenus && router.push(submenus[0].href)
      !opened && submenus && setOpened(true)
    }else{
      router.push(href);
    }
  }

  if (role && user?.role !== role) {
    return null;
  }

  const transitionClasses = {
    transition: "all 0.8s ease", 
  };
  
  return (
    <span style={opened ? transitionClasses : {}}> 
    {
    opened ? 
    <span>
        <UnstyledButton
          className={cx(classes.iconLabellink, { [classes.active]: isActive && submenus },  
            { [classes.submenuActive]: isActive && !submenus })}
          onClick={ handleMenuClick}
        >
          <Group px="sm" sx={{minWidth:"230px"}} position="apart">
            <Group>
               <Icon size="1.2rem" stroke={1.5} />
              <Text fz="md" >{label}</Text>
            </Group>
            {submenus && (submenuOpen ? <IconChevronUp /> :<IconChevronDown />) }
          </Group>
        </UnstyledButton>
        
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
    <Tooltip label={label} position="right">
        <UnstyledButton
          className={cx(classes.iconlink, { [classes.active]: isActive })}
          onClick={ handleMenuClick}
        >
          <Icon size="1.2rem" stroke={1.5} />
        </UnstyledButton>
    </Tooltip>
  }
    </span>
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
  { icon: IconDeviceDesktopAnalytics, label: 'Testimonials', href: '/dashboard/' },
  { icon: IconSpeakerphone, label: "Promotion", href: '/dashboard/promotion'},
  {icon: IconClipboardList, label: "Menu", href: '/dashboard/menu'}
];

interface  iProps {
  opened: boolean
  setOpened : React.Dispatch<React.SetStateAction<boolean>>
}

const LeftNavbar = ({opened, setOpened}: iProps) => {
  const theme = useMantineTheme();
  const isLargerThanSm = useMediaQuery("(min-width: 768px)");
  const { user, setUser } = useUser();
  const { classes, cx } = useLeftNavStyles();


  const links = mockdata.map((link) => {

    const submenusWithOpened = link.submenus?.map((submenu) => ({
      ...submenu,
      opened: opened,
    }));

    if (link?.role) {
      if (user?.role === link?.role) {
        return <NavbarLink opened={opened} setOpened={setOpened} {...link} key={link.label}           submenus={submenusWithOpened}
        />;
      }
    } else {
      return <NavbarLink  opened={opened} setOpened= {setOpened} {...link} key={link.label}           submenus={submenusWithOpened}
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
<Navbar width={{ base: opened ? 260 : 90 }} p="md"  className={classes.navbar}>
  <Group position={opened ? "apart" : "center"} mt={25}>
  <Center >
  {
  opened && 
  <Link href="/dashboard">
            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
             alt="RateUp Logo" width={130} height={30}  ml="sm" mr="50px"/>
          </Link>
  }
        <Burger
          opened={opened}
          onClick={() => {
            setOpened((o) => !o)
          }}
          size="sm"
          color={theme.colors.gray[6]}
        />      
  </Center>

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
