import { Tabs, TabsProps, rem } from '@mantine/core';

export default function StyledTabs(props: TabsProps) {
  return (
    <Tabs
      unstyled
      styles={(theme) => ({
        tab: {
          ...theme.fn.focusStyles(),
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
          color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[6],
          border: `${rem(1)} solid ${theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1]}`,
          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
          cursor: 'pointer',
          fontSize: theme.fontSizes.sm,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 25,
          paddingRight:25,
          boxShadow: theme.shadows.lg, 

          '&:not(:last-child)': {
            borderRight:`${rem(2)} solid ${theme.colors.gray[3]}`, 
          },
    

          '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed',
          },

          '&:not(:first-of-type)': {
            borderLeft: 0,
          },

          '&:first-of-type': {
            borderTopLeftRadius: theme.radius.md,
            borderBottomLeftRadius: theme.radius.md,
          },

          '&:last-of-type': {
            borderTopRightRadius: theme.radius.md,
            borderBottomRightRadius: theme.radius.md,
          },

          '&[data-active]': {
            color: `${theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[9]}`, 
            borderBottom: `${rem(2)} solid ${theme.colors.blue[9]}`, 
          },
        },

        tabIcon: {
          marginRight: theme.spacing.xs,
          display: 'flex',
          alignItems: 'center',
        },

        tabsList: {
          display: 'flex',
        },
      })}
      {...props}
    />
  );
}

