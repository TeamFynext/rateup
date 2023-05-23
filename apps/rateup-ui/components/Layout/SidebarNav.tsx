import React from 'react';
import { IconChartPie, IconHome, IconSettings, IconUsers, IconLogout, IconClipboardText } from '@tabler/icons';
import { Group, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { useRouter } from 'next/router';

interface MainLinkProps {
    icon: React.ReactNode;
    color: string;
    label: string;
    href: string;
}

function SidebarLink({ icon, color, label, href }: MainLinkProps) {
    const router = useRouter();
    return (
        <UnstyledButton
          sx={(theme) => ({
                display: 'block',
                width: '100%',
                padding: theme.spacing.xs,
                borderRadius: theme.radius.sm,
                color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
                '&:hover': {
                    backgroundColor:
                        theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
                },
            })}
          onClick={() => {
                router.push(href);
            }}
        >
            <Group>
                <ThemeIcon color={color} variant="light">
                    {icon}
                </ThemeIcon>
                <Text size="sm">{label}</Text>
            </Group>
        </UnstyledButton>
    );
}

const data = [
    { icon: <IconHome size={16} />, color: 'blue', label: 'Home', link: '/dashboard' },
    { icon: <IconClipboardText size={16} />, color: 'lime', label: 'Surveys', link: '/dashboard/surveys' },
    { icon: <IconChartPie size={16} />, color: 'teal', label: 'Insights', link: '/dashboard/insights' },
    { icon: <IconUsers size={16} />, color: 'red', label: 'Teams', link: '/dashboard/teams' },
    { icon: <IconSettings size={16} />, color: 'violet', label: 'Settings', link: '/dashboard/settings' },
    { icon: <IconLogout size={16} />, color: 'orange', label: 'Logout', link: '/auth/logout' }, // Add the logout menu item

];

export function SidebarNav() {
    const links = data.map((link) =>
        <SidebarLink
          {...link}
          key={link.label}
          href={link.link}
        />);
    return <a>{links}</a>;
}
