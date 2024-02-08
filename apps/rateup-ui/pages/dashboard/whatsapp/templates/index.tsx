import {
  Flex,
  Title,
  Menu,
  Space,
  SimpleGrid,
  Paper,
  Center,
  Stack,
  Text,
  Avatar,
  Group,
  Button,
  ActionIcon,
} from "@mantine/core";
import {
  IconChevronDown,
  IconPlus,
  IconCheck,
  IconX,
  IconDots,
  IconTrash,
  IconPencil,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
  useDeleteWaTemplateMutation,
  useWaTemplates,
} from "../../../../backend/whatsapp/whatsapp.query";
import WaTemplateStatusBadge from "../../../../components/whatsapp/templates/WaTemplateStatusBadge";
import { CreateWaTemplateModal } from "../../../../components/whatsapp/templates/CreateWaTemplateModal";
import { useDisclosure } from "@mantine/hooks";
import { getTimeSince } from "../../../../utils";
import { StopPropagation } from "../../../../components/containers/StopPropagation";
import { SyncTemplatesButton } from "../../../../components/whatsapp/templates/SyncTemplates";

export default function () {
  const { data: templates, isLoading, error } = useWaTemplates();
  const templateDeleteMutation = useDeleteWaTemplateMutation();
  const [isCreateModalOpened, { open, close }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState(null);

  // TODO: handle error
  function handleCreateClick() {
    setEditingItem(null);
    open();
  }
  function handleEditClick(template) {
    setEditingItem(template);
    open();
  }
  function handleClose() {
    close();
    setEditingItem(null);
  }
  return (
    <>
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="center"
        direction="row"
        wrap="wrap"
      >
        <Flex
          mih={50}
          gap="md"
          justify="flex-start"
          align="center"
          direction="row"
          wrap="wrap"
          mb="md"
        >
          <Title order={1}>Templates</Title>
          {/* TODO: Add sync button*/}
        </Flex>

        <Flex
          mih={50}
          gap="md"
          justify="flex-start"
          align="flex-start"
          direction="row"
          wrap="wrap"
        >
          <SyncTemplatesButton />
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button
                variant="subtle"
                rightSection={<IconChevronDown />}
                radius={"xl"}
                color="dark"
              >
                Status
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item color="teal" leftSection={<IconCheck size={14} />}>
                Active
              </Menu.Item>
              <Menu.Item color="red" leftSection={<IconX size={14} />}>
                Inactive
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Flex>
      </Flex>

      <Space h="xl" />

      <SimpleGrid spacing={"lg"} cols={{ base: 4, sm: 1, md: 2, lg: 2, xl: 3 }}>
        <Paper
          p="md"
          shadow="lg"
          radius="lg"
          style={{ cursor: "pointer" }}
          onClick={handleCreateClick}
        >
          <Center h="100%">
            <Stack align="center">
              <IconPlus size={36} />
              <Text size="xl" fw={700}>
                Add Template
              </Text>
            </Stack>
          </Center>
        </Paper>
        {templates &&
          templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              deleteMutation={templateDeleteMutation}
              onClick={() => handleEditClick(t)}
              onEditClick={() => handleEditClick(t)}
            />
          ))}
      </SimpleGrid>
      <CreateWaTemplateModal
        opened={isCreateModalOpened}
        onClose={handleClose}
        editingItem={editingItem}
      />
    </>
  );
}

function TemplateCard({ template, deleteMutation, onClick, onEditClick }) {
  const [timeSince, setTimeSince] = useState("");

  // TODO: create custom hook for this?
  useEffect(() => {
    setTimeSince(getTimeSince(template.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(template.createdAt)),
      5000,
    );
    return () => clearInterval(timeoutID);
  }, []);

  return (
    <>
      <Paper
        p="md"
        shadow="lg"
        withBorder
        radius="lg"
        style={{ cursor: "pointer" }}
        onClick={onClick}
      >
        <Flex justify={"space-between"} align={"center"}>
          <Text mr={"sm"} truncate size="xl" fw={700}>
            {template.data.name}
          </Text>
          <StopPropagation>
            <TemplateMenu
              template={template}
              deleteMutation={deleteMutation}
              onEditClick={onEditClick}
            />
          </StopPropagation>
        </Flex>
        <Group align={"center"} mt="sm" gap="xs">
          <Avatar radius={"xl"} />
          <Text size="sm" c="dimmed">
            Created {timeSince}
          </Text>
        </Group>
        <Space h="xl" />
        <Space h="lg" />
        <Group>
          <WaTemplateStatusBadge status={template.data.status} />
        </Group>
      </Paper>
    </>
  );
}

function TemplateMenu({ template, deleteMutation, onEditClick }) {
  return (
    <Menu width={200}>
      <Menu.Target>
        <ActionIcon>
          <IconDots />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPencil />} onClick={onEditClick}>
          Edit
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash />}
          onClick={() => {
            deleteMutation.mutate(template.id);
          }}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
