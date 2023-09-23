import { Container, Flex, Title, Menu, Space, SimpleGrid, Paper, Center, Stack, Text, Avatar, Group, Button, Badge, useMantineTheme, ActionIcon, Modal } from "@mantine/core";
import { IconChevronDown, IconPlus, IconCheck, IconX, IconDots, IconTrash, IconPencil } from "@tabler/icons-react";
import { TeamSelector } from "..";
import { useEffect, useState } from "react";
import { useDeleteWaTemplateMutation, useWaTemplates } from "../../../../backend/whatsapp/whatsapp.query";
import WaTemplateStatusBadge from "../../../../components/whatsapp/templates/WaTemplateStatusBadge";
import { CreateWaTemplateModal } from "../../../../components/whatsapp/templates/CreateWaTemplateModal";
import { useDisclosure } from "@mantine/hooks";
import { getTimeSince } from "../../../../utils";
import { StopPropagation } from "../../../../components/containers/StopPropagation";

export default function () {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const { data: templates, isLoading, error } = useWaTemplates(selectedTeamId)
  const templateDeleteMutation = useDeleteWaTemplateMutation(selectedTeamId)
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
    <Container fluid>
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
          <Title order={1}>Surveys : </Title>

          <TeamSelector
            selectedTeamId={selectedTeamId}
            setSelectedTeamId={setSelectedTeamId}
          />
        </Flex>

        <Flex
          mih={50}
          gap="md"
          justify="flex-start"
          align="flex-start"
          direction="row"
          wrap="wrap"
        >

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button
                variant="subtle"
                rightIcon={<IconChevronDown />}
                radius={"xl"}
                color="dark"
              >
                Status
              </Button>
            </Menu.Target>
            <Menu.Dropdown >
              <Menu.Item color="teal" icon={<IconCheck size={14} />}>Active</Menu.Item>
              <Menu.Item color="red" icon={<IconX size={14} />}>Inactive</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Flex>
      </Flex>

      <Space h="xl" />

      <SimpleGrid
        cols={4}
        spacing={"lg"}
        breakpoints={[
          { minWidth: "xl", cols: 3 },
          { minWidth: "lg", cols: 2 },
          { minWidth: "md", cols: 2 },
          { maxWidth: "md", cols: 1 },
        ]}
      >
        <Paper
          p="md"
          shadow="lg"
          radius="lg"
          sx={{ cursor: "pointer" }}
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
        {templates && templates.map(t => (
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
    </Container>
  )
}

function TemplateCard({ template, deleteMutation, onClick, onEditClick }) {
  const [timeSince, setTimeSince] = useState("");

  // TODO: create custom hook for this?
  useEffect(() => {
    setTimeSince(getTimeSince(template.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(template.createdAt)),
      5000
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
        sx={{ cursor: "pointer" }}
        onClick={onClick}
      >
        <Flex justify={"space-between"} align={"center"}>
          <Text mr={"sm"} truncate size="xl" fw={700}>
            {template.data.name}
          </Text>
          <StopPropagation>
            <TemplateMenu template={template} deleteMutation={deleteMutation} onEditClick={onEditClick}  />
          </StopPropagation>
        </Flex>
        <Group align={"center"} mt="sm" spacing="xs">
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
      <Menu.Target >
        <ActionIcon
        >
          <IconDots />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          icon={<IconPencil />}
          onClick={onEditClick}
        >
          Edit
        </Menu.Item>
        <Menu.Item
          icon={<IconTrash />}
          onClick={() => {
            deleteMutation.mutate(template.id)
          }}
        >Delete</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}