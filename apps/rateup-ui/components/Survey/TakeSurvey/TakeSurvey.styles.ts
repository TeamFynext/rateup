import { createStyles } from '@mantine/core';

export const useStyles = createStyles((theme) => ({

    inputBox: {
        width: '90vw',
        maxWidth: "500px",
        color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
        borderRadius: theme.radius.md,
        transition: 'background-color 100ms ease',
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
        padding: `6px ${theme.spacing.sm}`,
        borderColor: theme.colors.blue[9],
        borderWidth: '1px',
        borderStyle: 'solid',
  
        '&:focus-within': {
          borderColor: theme.colors.yellow[6],
        },
      },


}))