import { Tabs, TabsProps, rem } from "@mantine/core";

export default function StyledTabs(props: TabsProps) {
    return (
      <Tabs
        unstyled
        styles={(theme) => ({
          tab: {
            ...theme.fn.focusStyles(),
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
            color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[9],
            border: `${rem(1)} solid ${theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[5]}`,
            padding: `${theme.spacing.sm} ${theme.spacing.sm}`,
            cursor: 'pointer',
            fontSize: theme.fontSizes.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent:'center',
            width: "50%",
            maxWidth: "300px",
            textAlign: "center",
  
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
              backgroundColor: theme.colors.blue[9],
              borderColor: theme.colors.blue[9],
              color: theme.white,
            },
          },
  
            tabsList: {
            display: 'flex',
          },
        })}
        {...props}
      />
    );
  }