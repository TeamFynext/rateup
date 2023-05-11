import React, { useState } from 'react';
import {
    AppShell,
    Burger,
    createStyles,
    Header,
    Image,
    MediaQuery,
    Navbar,
    Text,
    Title,
    useMantineTheme,
} from '@mantine/core';
import { SidebarNav } from './SidebarNav';
import { SessionAuth } from "supertokens-auth-react/recipe/session";

const useStyles = createStyles((theme) => ({
    title: {
        color: theme.white,
        fontFamily: `Greycliff CF,  ${theme.fontFamily}`,
        fontWeight: 900,
        lineHeight: 1.05,
        maxWidth: 1000,
        fontSize: 32,

        [theme.fn.smallerThan('md')]: {
            maxWidth: '100%',
            fontSize: 34,
            lineHeight: 1.15,
        },
    },
}));

// @ts-ignore
export default ({ children }) => {
    const theme = useMantineTheme();
    const { classes } = useStyles();

    const [opened, setOpened] = useState(false);
    return (
        <SessionAuth>
        <AppShell
          styles={{
                main: {
                    background: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
                },
            }}
          navbarOffsetBreakpoint="sm"
          asideOffsetBreakpoint="sm"
          navbar={
                <Navbar p="md" hiddenBreakpoint="sm" hidden={!opened} width={{ sm: 200, lg: 300 }}>
                    <SidebarNav />
                    <Navbar.Section style={{ marginTop: 'auto' }}>
                        <a href="#" onClick={(event) => event.preventDefault()}>
                            <Image src="resolve.png" />
                        </a>
                    </Navbar.Section>
                </Navbar>
            }
          header={
                <Header height={{ base: 50, md: 70 }} p="md">
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
                            <Burger
                              opened={opened}
                              onClick={() => setOpened((o) => !o)}
                              size="sm"
                              color={theme.colors.gray[6]}
                              mr="xl"
                            />
                        </MediaQuery>

                        <Title className={classes.title}>

                            <Text
                              component="span"
                              inherit
                              variant="gradient"
                              gradient={{ from: 'cyan', to: 'blue' }}
                            >
                                Rateup
                            </Text>{' '}

                        </Title>
                    </div>
                </Header>
            }
        >
            {children}
        </AppShell>
        </SessionAuth>
    );
};
