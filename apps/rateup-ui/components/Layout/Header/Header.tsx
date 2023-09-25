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
import { useUser } from '../../../context/UserContext';

interface  iProps {
  mode? : string
  opened?: boolean
}

export function HeaderTabs({mode, opened} : iProps) {
  const { classes, theme, cx } = useStyles();
  const [isOpen, { toggle }] = useDisclosure(false);
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const [userProfileAvatar, setUserProfileAvatar] = useState(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/user.png`)
 const { user, setUser } = useUser();

  useEffect(() => {
    if (user?.profilePhoto) {
      const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user?.profilePhoto}`
      setUserProfileAvatar(imgUrl)
    } else {
      setUserProfileAvatar(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/profile-photo.png`)
    }
  }, [user])
  
  
  const userInfo = {
    "name": user?.userName,
    "email": user?.email,
    "role": !user?.role ? "...error..."  : (user?.role === 'SUPER_ADMIN' ? "Super Admin" : (user?.role === 'ADMIN' ? "Admin" : "Team Member")),
    "image": userProfileAvatar
  };

  const MenuItemWithLink = ({ icon, href, children }) => (
   
      <Link href={href} className={classes.link}>
         <Menu.Item icon={icon}>{children}</Menu.Item>
      </Link>
  );
  
  // const menuItems = [
  //   {
  //     icon: <IconCheckupList size="0.9rem" color={theme.colors.yellow[6]} stroke={1.5} />,
  //     href: "/dashboard/surveys",
  //     text: "Surveys",
  //   },
  //   {
  //     icon: <IconUsers size="0.9rem" color={theme.colors.blue[6]} stroke={1.5} />,
  //     href: "/dashboard/teams",
  //     text: "Teams",
  //   },
  //   {
  //     icon: <IconGitBranch size="0.9rem" color={theme.colors.red[6]} stroke={1.5} />,
  //     href: "/dashboard/",
  //     text: "Branches",
  //   },
  //   {
  //     icon: <IconSettings size="0.9rem" stroke={1.5} />,
  //     href: "/dashboard/settings",
  //     text: "Settings",
  //   },
  //   {
  //     icon: <IconLogout size="0.9rem" stroke={1.5} />,
  //     href: "/auth/logout",
  //     text: "Logout",
  //     isDivider: true,
  //     color: "red",
  //   },
  // ];

  return (
    <div className={classes.header}>
      <Container 
          style={{
            marginLeft: opened ? "130px" : "0", 
            transition: "margin-left 0.3s ease-in-out", 
          }}
          className={classes.mainSection} 
      fluid>

      {mode !== "GUEST" 

        ?

        <Group position="apart">
          <Link href="/dashboard">
          <Image
            height={ user?.orgLogo ? 50 : 40}
            src={
              user?.orgLogo && user?.orgLogo !== 'REMOVED_PHOTO' ?
              `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.orgLogo}`
              : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`
            }
          />

          </Link>
        
        

          <Burger opened={isOpen} onClick={toggle} className={classes.burger} size="sm" />

          <Group position="apart">
          {/* <Paper shadow="sm"
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
          </Paper> */}
              {/* <Paper shadow="sm"
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
            </Paper> */}
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

                <Group sx={{minWidth: '150px'}}>
                      <Avatar src={userInfo?.image} alt={userInfo.name} radius="xl" size={30} />

                  <div style={{ flex: 1 }}>
                    <Text size="sm" weight={500} sx={{ lineHeight: 1 }} mr={6}>
                      {userInfo.name ?userInfo.name : userInfo.email}
                    </Text>

                    <Text color="dimmed" size="xs">
                      {userInfo.role}
                    </Text>
                    
                  </div>
                      {/* <IconChevronDown size={rem(12)} stroke={1.5} /> */}
              </Group>

              </Paper>
            </Menu.Target>

                {/* <Menu.Dropdown>
            {menuItems.map((item, index) => (
                <span key={index}>
                {item.isDivider && <Menu.Divider />}
                <MenuItemWithLink icon={item.icon} href={item.href}>
                    {item.text}
                </MenuItemWithLink>
                </span>
            ))}
            </Menu.Dropdown> */}

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