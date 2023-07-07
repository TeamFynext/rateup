import { useState , useEffect} from 'react';
import {
  Container,
  Avatar,
  Autocomplete,
  Group,
  Text,
  Menu,
  Paper,
  Burger,
  rem,
  Image,
  Space,
  ActionIcon
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLogout,
  IconSearch,
  IconUsers,
  IconCheckupList,
  IconGitBranch,
  IconSettings,
  IconChevronDown,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import Link from 'next/link';
import { Navbar } from '../Navbar/Navbar';
import { useStyles } from './Header.styles';

export function HeaderTabs({userData, mode} : {userData? : UserData, mode?: string}) {
  const { classes, theme, cx } = useStyles();
  const [opened, { toggle }] = useDisclosure(false);
  const [userMenuOpened, setUserMenuOpened] = useState(false);

  useEffect(() => {
    console.log("Email:  "+ JSON.stringify(userData?.email))
  }, [userData])
  
  
  const user = {
    "name": userData?.email,
    "role": !userData?.role ? "...error..."  : (userData?.role === 'SUPER_ADMIN' ? "Super Admin" : "Admin"),
    "image": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=255&q=80"
  };
  //TODO

  const MenuItemWithLink = ({ icon, href, children }) => (
   
      <Link href={href} className={classes.link}>
         <Menu.Item icon={icon}>{children}</Menu.Item>
      </Link>
  );
  
  const menuItems = [
    {
      icon: <IconCheckupList size="0.9rem" color={theme.colors.yellow[6]} stroke={1.5} />,
      href: "/dashboard/surveys",
      text: "Surveys",
    },
    {
      icon: <IconUsers size="0.9rem" color={theme.colors.blue[6]} stroke={1.5} />,
      href: "/dashboard/teams",
      text: "Teams",
    },
    {
      icon: <IconGitBranch size="0.9rem" color={theme.colors.red[6]} stroke={1.5} />,
      href: "/dashboard/",
      text: "Branches",
    },
    {
      icon: <IconSettings size="0.9rem" stroke={1.5} />,
      href: "/dashboard/settings",
      text: "Settings",
    },
    {
      icon: <IconLogout size="0.9rem" stroke={1.5} />,
      href: "/auth/logout",
      text: "Logout",
      isDivider: true,
      color: "red",
    },
  ];

  return (
    <div className={classes.header}>
      <Container className={classes.mainSection} fluid>

      {mode !== "GUEST" 

        ?

        <Group position="apart">
          <Link href="/dashboard">
            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} alt="RateUp Logo" width={150} height={40} />
          </Link>
        
        

          <Burger opened={opened} onClick={toggle} className={classes.burger} size="sm" />

          <Group position="apart">
          <Paper shadow="sm"
                className={classes.searchBox}
              >
              <Autocomplete
                className={classes.search}
                placeholder="Search Surveys"
                icon={<IconSearch size="1.3rem" stroke={1.3} />}
                data={['Feedback', 'Testinomials', 'lorem ipsum', ]}
                variant="unstyled"
                size='md'
              />
          </Paper>
          <Paper shadow="sm"
                className={classes.colorModeBox}
              >
                <Group position="apart">
                  <ActionIcon size="xl" radius="xl" variant="transparent">
                  <IconMoon />
                </ActionIcon>
                  <ActionIcon color="yellow" size="xl" radius="xl">
                  <IconSun />
               </ActionIcon>
                </Group>
            </Paper>
          <Menu
            width={260}
            position="bottom-end"
            transitionProps={{ transition: 'pop-top-right' }}
            onClose={() => setUserMenuOpened(false)}
            onOpen={() => setUserMenuOpened(true)}
            withinPortal
          >
            <Menu.Target>
              <Paper shadow="sm"
                className={cx(classes.user, { [classes.userActive]: userMenuOpened }, classes.cursor)}
              >

                <Group>
                  <Avatar src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/user.png`} alt={user.name} radius="xl" size={30} />

                  <div style={{ flex: 1 }}>
                    <Text size="sm" weight={500} sx={{ lineHeight: 1 }} mr={6}>
                      {user.name}
                    </Text>

                    <Text color="dimmed" size="xs">
                      {user.role}
                    </Text>
                    
                  </div>
                  <IconChevronDown size={rem(12)} stroke={1.5} />
              </Group>

              </Paper>
            </Menu.Target>

            <Menu.Dropdown>
            {menuItems.map((item, index) => (
                <span key={index}>
                {item.isDivider && <Menu.Divider />}
                <MenuItemWithLink icon={item.icon} href={item.href}>
                    {item.text}
                </MenuItemWithLink>
                </span>
            ))}
            </Menu.Dropdown>

          </Menu>
        </Group>
        </Group>

        :

          <Link href="/">
            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} alt="RateUp Logo" width={150} height={40} />
          </Link>

      }

        <Space h="lg" />
           {mode !== "GUEST" &&  <Navbar /> }
        <Space h="lg" />


      </Container>
    </div>
  );
}