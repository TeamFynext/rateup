import { createStyles } from '@mantine/core';

export const useStyles = createStyles((theme) => ({
    header: {
      paddingTop: theme.spacing.sm,
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
  
    },
  
    mainSection: {
      paddingBottom: theme.spacing.sm,
      paddingLeft:"10vw",
      paddingRight:"10vw",
      paddingTop:"3vh"
    },
  
    user: {
      color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      borderRadius: theme.radius.xl,
      transition: 'background-color 100ms ease',
      paddingLeft: "20px",
      paddingRight:"30px",
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
  
  
      '&:hover': {
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
        boxShadow: theme.shadows.lg,
  
      },
  
      [theme.fn.smallerThan('xs')]: {
        display: 'none',
      },
    },
  
    burger: {
      [theme.fn.largerThan('xs')]: {
        display: 'none',
      },
    },
  
    userActive: {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
    },
  
  
    link: {
      textDecoration: "none",
    },
    search: {
      [theme.fn.smallerThan('xs')]: {
        display: 'none',
      },
      border:"none",
      outline: 'none',
    },
    
  }));