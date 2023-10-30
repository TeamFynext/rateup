import { Flex, Group, Paper, Text, Title } from "@mantine/core";
import { RateupButtonSecondary } from "../Button/RateupButtons";

const ContactCard = ({ contact }) => {
  return (
    <Paper shadow="xl" radius="md" p="xl">
      <Title order={5}>{contact?.name}</Title>
      <Text c="dimmed">{contact?.phone}</Text>
      <Text c="dimmed">{contact?.email}</Text>
      <Group justify="space-between">
        <Text c="dimmed">created on {contact?.createdAt}</Text>
        <RateupButtonSecondary title="Team id"></RateupButtonSecondary>
      </Group>
    </Paper>
  );
};

export default ContactCard;
