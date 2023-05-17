import React from 'react';
import {
    AppShell,
    useMantineTheme,
    Container,
    createStyles
} from '@mantine/core';
import { SessionAuth } from "supertokens-auth-react/recipe/session";
import { HeaderTabs } from './Header/Header';

const useStyles = createStyles((theme) => ({
  
    appShellBody: {
      paddingLeft:"10vw",
      paddingRight:"10vw"
    },

}));

// @ts-ignore
export default ({ children }) => {
    const theme = useMantineTheme();
    const { classes } = useStyles();

    return (
        <SessionAuth>
        <AppShell
          styles={{
                main: {
                    background: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
                },
            }}

          header={
                <HeaderTabs />
            }
        >
            <Container className={classes.appShellBody} fluid>
                {children}
            </Container>
            
        </AppShell>
        </SessionAuth>
    );
};
