import { createStyles, rem } from '@mantine/core';

export default createStyles((theme) => ({
    layout:{
        background: 'linear-gradient(to bottom, #FFFFFF 0%, #F7F7F7 100%)',
        padding: 0
    },
    inner: {
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: `calc(${theme.spacing.xl} * 4)`,
        paddingBottom: `calc(${theme.spacing.xl} * 4)`,
    },

    yellowBox:{
        background: 'linear-gradient(to bottom, #FFD54C 0%, #FFB320 100%)',
        minHeight: '100px',
        marginTop: "40px",
        marginBottom: '40px'
    },

    whiteBox:{
        background: '#fff',
    },

    blueBox:{
        background: 'linear-gradient(to bottom right, #62CBE6 0%, #3F5BA9 100%)',
        color:'#fff',
        paddingTop:"120px",
        paddingBottom:"120px",

    },

    wrapContainer: {
        margin: '0 auto',
        maxWidth: '1200px',
        padding: '20px',
        boxSizing: 'border-box' as const,
    },

    horizontalGaps: {
        paddingRight: "100px",
        paddingLeft: "100px",
        
        [theme.fn.smallerThan('md')]: {
            paddingRight: "10px", 
            paddingLeft: "10px",
        },
    },

    footerNav: {
        textAlign: 'center',
        textDecoration: 'none',
    
        '& a': {
          textDecoration: 'none',
          color: 'inherit',
          paddingRight:'10px'
        },
    
        '& a:hover': {
            transform: 'scale(1.1)', 
            //fontWeight: 'bold',
            transition: 'transform 0.2s ease', 
          },
    
        '& div': {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
      },


    content: {
        maxWidth: rem(480),
        marginRight: `calc(${theme.spacing.xl} * 3)`,

        [theme.fn.smallerThan('md')]: {
            maxWidth: '100%',
            marginRight: 0,
        },
    },

    title: {
        color: theme.colorScheme === 'dark' ? theme.white : theme.black,
        fontFamily: `Greycliff CF, ${theme.fontFamily}`,
        fontSize: rem(44),
        lineHeight: 1.2,
        fontWeight: 900,

        [theme.fn.smallerThan('xs')]: {
            fontSize: rem(28),
        },
    },

    control: {
        [theme.fn.smallerThan('xs')]: {
            flex: 1,
        },
    },

    image: {
        flex: 1,

        [theme.fn.smallerThan('md')]: {
            display: 'none',
        },
    },

    highlight: {
        position: 'relative',
        backgroundColor: theme.fn.variant({ variant: 'light', color: theme.primaryColor }).background,
        borderRadius: theme.radius.sm,
        padding: `${rem(4)} ${rem(12)}`,
    },
}));
