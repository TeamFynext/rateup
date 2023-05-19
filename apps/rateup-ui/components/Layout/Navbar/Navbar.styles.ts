import { createStyles } from '@mantine/core';

export const useStyles = createStyles((theme) => ({
    link: {
      textDecoration: 'none',
      lineHeight: '20px',
      ':hover': {
        textDecoration: 'underline',
      },
      paddingRight:'8px',
      paddingLeft:'8px',
      fontWeight: 600
    },
}));
