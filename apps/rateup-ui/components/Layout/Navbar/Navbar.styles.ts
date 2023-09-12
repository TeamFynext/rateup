import { createStyles, rem } from '@mantine/core';

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

export const useLeftNavStyles = createStyles((theme) => ({
  iconlink: {
    width: rem(50),
    height: rem(50),
    borderRadius: theme.radius.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.3s ease",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[0],
    },
  },

  iconLabellink: {
    height: rem(50),
    borderRadius: theme.radius.md,
    transition: "transform 0.3s ease",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[0],
    },
  },

  active: {
    "&, &:hover": {
      backgroundColor: theme.fn.variant({
        variant: "light",
        color: theme.primaryColor,
      }).background,
      color: theme.fn.variant({ variant: "light", color: theme.primaryColor })
        .color,
    },
  },

  submenuActive: {
    "&, &:hover": {
      color: theme.fn.variant({ variant: "light", color: theme.primaryColor })
        .color,
    },
  },

  navbar: {
    transition: "width 0.3s ease-in-out"
  },

  submenuLink: {
    paddingLeft: theme.spacing.md,

  },

}));
