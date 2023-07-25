
import { createStyles } from '@mantine/core';

export const useStyles = createStyles((theme) => ({
  forgot: {
     textDecoration: 'none',
     color:'#000',

    '&:hover': {
      textDecoration: 'underline',
    },
  },

  createAcc: {
    textDecoration: 'none',
    background: 'linear-gradient(160deg, #62CBE6, #3F5BA9)',
  '-webkit-background-clip': 'text',
  '-webkit-text-fill-color': 'transparent',
    fontWeight: 'bold',

   '&:hover': {
     textDecoration: 'underline',
   },
 },


}));
