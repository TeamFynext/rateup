import React from "react";

import {
  Avatar,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  IconClock,
  IconInbox,
  IconMessage,
  IconMessagePlus,
  IconUserCheck,
  IconUserExclamation,
  IconUserOff,
  IconUserPlus,
  IconUserX,
} from "@tabler/icons-react";

import { useGetInboxAnalytics } from "@/backend/whatsapp/inbox/message/wamessage.query";

const Analytics = () => {
  const { data, isLoading, error } = useGetInboxAnalytics();
  if (isLoading) {
    return <Text>Loading...</Text>;
  }
  if (error) {
    return <Text>Error loading analytics</Text>;
  }
  return (
    <Container
      w={"100%"}
      h={"100%"}
      p={0}
      className="flex flex-col"
      size={"xl"}
    >
      <Stack justify="left">
        <Title order={2}>Inbox Analytics</Title>
        <Text>Monitor your customer support performance and trends</Text>
        <SimpleGrid cols={3}>
          <Card withBorder shadow="sm" p="md" radius={"md"}>
            <div className="flex justify-between items-center">
              <div>
                <Text className="text-gray-600" size="sm" fw={500}>
                  Total Messages
                </Text>
                <Title order={3} mt={5}>
                  {data?.waMessageCount.toLocaleString() || 0}
                </Title>
              </div>
              <IconMessage size={24} className="text-blue-500" />
            </div>
          </Card>

          <Card withBorder shadow="sm" p="md" radius={"md"}>
            <div className="flex justify-between items-center">
              <div>
                <Text className="text-gray-600" size="sm" fw={500}>
                  New Chats
                </Text>
                <Title order={3} mt={5}>
                  {data?.newChatCount.toLocaleString() || 0}
                </Title>
              </div>
              <IconMessagePlus size={24} className="text-green-500" />
            </div>
          </Card>

          <Card withBorder shadow="sm" p="md" radius={"md"}>
            <div className="flex justify-between items-center">
              <div>
                <Text className="text-gray-600" size="sm" fw={500}>
                  Unassigned Contacts
                </Text>
                <Title order={3} mt={5}>
                  {data?.unassignedContactCount.toLocaleString() || 0}
                </Title>
              </div>
              <IconUserOff size={24} className="text-gray-500" />
            </div>
          </Card>

          <Card withBorder shadow="sm" p="md" radius={"md"}>
            <div className="flex justify-between items-center">
              <div>
                <Text className="text-gray-600" size="sm" fw={500}>
                  Assigned Contacts
                </Text>
                <Title order={3} mt={5}>
                  {data?.assignedContactCount.toLocaleString() || 0}
                </Title>
              </div>
              <IconUserCheck size={24} className="text-indigo-500" />
            </div>
          </Card>

          <Card withBorder shadow="sm" p="md" radius={"md"}>
            <div className="flex justify-between items-center">
              <div>
                <Text className="text-gray-600" size="sm" fw={500}>
                  New Contacts
                </Text>
                <Title order={3} mt={5}>
                  {data?.newContactCount.toLocaleString() || 0}
                </Title>
              </div>
              <IconUserPlus size={24} className="text-teal-500" />
            </div>
          </Card>

          <Card withBorder shadow="sm" p="md" radius={"md"}>
            <div className="flex justify-between items-center">
              <div>
                <Text className="text-gray-600" size="sm" fw={500}>
                  Closed Contacts
                </Text>
                <Title order={3} mt={5}>
                  {data?.closedContactCount.toLocaleString() || 0}
                </Title>
              </div>
              <IconUserX size={24} className="text-red-500" />
            </div>
          </Card>

          <Card withBorder shadow="sm" p="md" radius={"md"}>
            <div className="flex justify-between items-center">
              <div>
                <Text className="text-gray-600" size="sm" fw={500}>
                  Blocked Contacts
                </Text>
                <Title order={3} mt={5}>
                  {data?.blockedContactCount.toLocaleString() || 0}
                </Title>
              </div>
              <IconUserExclamation size={24} className="text-yellow-500" />
            </div>
          </Card>

          <Card withBorder shadow="sm" p="md" radius={"md"}>
            <div className="flex justify-between items-center">
              <div>
                <Text className="text-gray-600" size="sm" fw={500}>
                  Assigned Inboxes
                </Text>
                <Title order={3} mt={5}>
                  {data?.waInboxAssignedCount.toLocaleString() || 0}
                </Title>
              </div>
              <IconInbox size={24} className="text-purple-500" />
            </div>
          </Card>
        </SimpleGrid>

        {/* {data?.assignedUserCounts && data.assignedUserCounts.length > 0 && ( */}
        <Card withBorder shadow="sm" w="100%" radius={"md"}>
          <Title order={4} mb={10}>
            Agent Performance
          </Title>
          <Table verticalSpacing={"sm"}>
            <Table.Thead className="bg-gray-50">
              <Table.Tr>
                <Table.Th>Agent</Table.Th>
                <Table.Th>Messages Handled</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.assignedUserCounts ? (
                <Text p={"sm"}>no data</Text>
              ) : (
                data.assignedUserCounts.map((user) => (
                  <Table.Tr key={user.userId}>
                    <Table.Td>
                      <Group>
                        <Avatar
                          key={user.userName}
                          name={user.userName}
                          color="initials"
                        />
                        {user.userName}
                      </Group>
                    </Table.Td>
                    <Table.Td>{user.assignCount}</Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Card>
        {/* )} */}
      </Stack>
    </Container>
  );
};

export default Analytics;
