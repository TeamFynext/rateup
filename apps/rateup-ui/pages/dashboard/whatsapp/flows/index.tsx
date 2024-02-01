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
  Loader,
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
import { CreateWaTemplateModal } from "../../../../components/whatsapp/templates/CreateWaTemplateModal";
import { useDisclosure } from "@mantine/hooks";
import { getTimeSince } from "../../../../utils";
import { StopPropagation } from "../../../../components/containers/StopPropagation";
import WaFlowStatusBadge from "../../../../components/whatsapp/flows/WaTemplateStatusBadge";
import { SurveyType, WaFlowStatus } from "../../../../types/enums";
import { SyncFlowsButton } from "../../../../components/whatsapp/flows/SyncFlows";
import { useSurveys } from "../../../../backend/surveys/surveys.query";
import { SurveysPageError } from "../../../../components/Survey/SurveysPage/SurveyPageError";
import { SurveyCard } from "../../../../components/Card/SurveyCard/SurveyCard";
import { useTeamsByUser } from "../../../../backend/team/team.query";

export default function () {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const {
    isLoading,
    error,
    data: allSurveys,
    refetch,
  } = useSurveys(!!selectedTeamId);
  const [isCreateModalOpened, { open, close }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState(null);
  const {
    data: teamRes,
    isLoading: teamsLoading,
    error: tError,
  } = useTeamsByUser();
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
  if (isLoading) return <Loader type="bars" />;
  if (error || !Array.isArray(allSurveys)) {
    console.error(allSurveys, error);
    return <SurveysPageError refetch={refetch} />;
  }
  const surveys = allSurveys.filter((s) => s.type === SurveyType.WaFlow);
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
          <Title order={1}>Flows</Title>
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
          <SyncFlowsButton />
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
                Add Flow
              </Text>
            </Stack>
          </Center>
        </Paper>
        {surveys.map((s) => (
          <SurveyCard
            key={s.id}
            survey={s}
            handleCheckBox={() => {}}
            isChecked={false}
            selectedTeamId={selectedTeamId}
            teamsData={teamRes?.data}
            route={`/dashboard/whatsapp/surveys/${s.id}`}
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

// TODO: create reusable component?
// copied from pages/dashboard/whatsapp/templates/index.tsx
interface CardProps {
  data: {
    id: string;
    name: string;
    status: WaFlowStatus;
    createdAt: string;
  };
  deleteMutation: () => void;
  onClick: () => void;
  onEditClick: () => void;
}
function Card({ data, deleteMutation, onClick, onEditClick }: CardProps) {
  const [timeSince, setTimeSince] = useState("");

  // TODO: create custom hook for this?
  useEffect(() => {
    setTimeSince(getTimeSince(data.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(data.createdAt)),
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
            {data.name}
          </Text>
          <StopPropagation>
            <CardMenu
              id={data.id}
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
          <WaFlowStatusBadge status={data.status} />
        </Group>
      </Paper>
    </>
  );
}

function CardMenu({ id, deleteMutation, onEditClick }) {
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
            deleteMutation.mutate(id);
          }}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
