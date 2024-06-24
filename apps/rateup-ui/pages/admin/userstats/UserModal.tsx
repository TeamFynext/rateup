import { Stack, Group, Avatar, Title, Divider, Text } from "@mantine/core";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";

const UserModal = ({ selectedUser }: { selectedUser: UserData }) => {
  return (
    <Stack gap={"xl"}>
      <Group justify="space-around">
        <Stack gap={1}>
          <Avatar
            src={
              `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${selectedUser.profilePhoto}` ??
              null
            }
            size={"xl"}
          />
          <Title order={4}>{selectedUser?.userName}</Title>
        </Stack>
        <Stack>
          <Group gap={1}>
            <Text fw={600} size="sm" w={110}>
              Email ID
            </Text>
            <Text size="sm" c={"dimmed"}>
              {selectedUser?.email}
            </Text>
          </Group>
          <Group gap={1}>
            <Text fw={600} size="sm" w={110}>
              User ID
            </Text>
            <Text size="sm" c={"dimmed"}>
              {" "}
              {selectedUser?.userId}
            </Text>
          </Group>
          <Group gap={1}>
            <Text fw={600} size="sm" w={110}>
              Phone Number
            </Text>
            <Text size="sm" c={"dimmed"}>
              {selectedUser?.phone ?? "---"}
            </Text>
          </Group>
        </Stack>
      </Group>

      <PaperLayout>
        <Title order={3}>Organization</Title>
        <Divider my={"sm"} />
        <Group justify="space-around">
          <Stack gap={1}>
            <Avatar
              src={
                `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${selectedUser.orgLogo}` ??
                null
              }
              size={"lg"}
            />
            <Title order={5}>{selectedUser?.orgName}</Title>
            <Text size="xs" c={"dimmed"}>
              {selectedUser.role}
            </Text>
          </Stack>
          <Stack>
            <Group gap={1}>
              <Text fw={600} size="sm" w={110}>
                Org ID
              </Text>
              <Text size="sm" c={"dimmed"}>
                {selectedUser.orgId}
              </Text>
            </Group>
            <Group gap={1}>
              <Text fw={600} size="sm" w={110}>
                Phone Number
              </Text>
              <Text size="sm" c={"dimmed"}>
                {selectedUser.orgPhone ?? "---"}
              </Text>
            </Group>
            <Group gap={1}>
              <Text fw={600} size="sm" w={110}>
                Address
              </Text>
              <Text size="sm" c={"dimmed"}>
                {selectedUser.orgAddress ?? "---"}
              </Text>
            </Group>
          </Stack>
        </Group>
      </PaperLayout>
    </Stack>
  );
};

export default UserModal;
