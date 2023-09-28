import { useState , useEffect} from 'react';
import {
  Container,
  Avatar,
  Group,
  Text,
  Menu,
  Paper,
  Image,
  Space,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import Link from 'next/link';
import { Navbar } from '../Navbar/Navbar';
import classes from './Header.module.css';
import { useUser } from '../../../context/UserContext';
import cx from 'clsx';

interface  iProps {
  mode? : string
  opened?: boolean
}

export function HeaderTabs({mode, opened} : iProps) {
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

  return (
    <div className={classes.header}>
      <Container 
          className={classes.mainSection} 
          style={{
            marginLeft: opened ? "130px" : "0", 
            transition: "margin-left 0.3s ease-in-out", 
            paddingLeft: '10vw',
            paddingRight: '10vw'
          }}
      fluid>

      {mode !== "GUEST" 

        ?

        <Group justify="space-between">
          <Link href="/dashboard">
          <Image
            h={ user?.orgLogo ? 50 : 40}
            src={
              user?.orgLogo && user?.orgLogo !== 'REMOVED_PHOTO' ?
              `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.orgLogo}`
              : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`
            }
          />

          </Link>
        
      
          {/* <Burger opened={isOpen} onClick={toggle} className={classes.burger} size="sm" /> */}

          <Group justify="space-between">

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

                <Group style={{minWidth: '150px'}}>
                      <Avatar src={userInfo?.image} alt={userInfo.name} radius="xl" size={30} />

                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500} style={{ lineHeight: 1 }} mr={6}>
                      {userInfo.name ?userInfo.name : userInfo.email}
                    </Text>

                    <Text c="dimmed" size="xs">
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
            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} alt="RateUp Logo" w={150} h={40} />
          </Link>

      }

        <Space h="lg" />
           {mode !== "GUEST" &&  <Navbar /> }
        <Space h="lg" />


      </Container>
    </div>
  );
}