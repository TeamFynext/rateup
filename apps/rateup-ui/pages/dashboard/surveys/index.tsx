import {
  Center,
  Container,
  Paper,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Flex,
  Menu,
  Avatar,
  Badge,
  ActionIcon,
  useMantineTheme,
  Group,
} from "@mantine/core";
import {
  IconCopy,
  IconDots,
  IconEdit,
  IconMessage,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { deleteSurvey, getSurveys } from "../../../api";
import { getTimeSince } from "../../../utils";
import { useDisclosure } from "@mantine/hooks";
import { CreateSurveyModal } from "../../../components/Survey/CreateSurveyModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { notifications } from "@mantine/notifications";


export default function Surveys({surveys}) {
  const [createSurveyOpened, {open, close}] = useDisclosure(false)

  return (
    <Container fluid>
      <Title order={2} mb={"md"}>Surveys</Title>
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
        <Paper p="md" sx={{ cursor: "pointer" }} onClick={open}>
          <Center h="100%">
            <Stack align="center">
              <IconPlus />
              <Text size="xl">Add Survey</Text>
            </Stack>
          </Center>
        </Paper>

        {surveys.map((s) => (
          <SurveyCard key={s.id} survey={s} />
        ))}
      </SimpleGrid>
      <CreateSurveyModal open={createSurveyOpened} close={close} />
    </Container>
  );
}

function SurveyCard({ survey }): JSX.Element {
  const theme = useMantineTheme();
  const [timeSince, setTimeSince] = useState('');
  useEffect(() => {
    setTimeSince(getTimeSince(survey.createdAt))
    const timeoutID = setInterval(() => setTimeSince(getTimeSince(survey.createdAt)), 5000);
    return () => clearInterval(timeoutID)
  },[])
  
  const router = useRouter();

  return (
    <Paper p="md" sx={{cursor: "pointer"}} onClick={() => {router.push(`surveys/${survey.id}`)}}>
      <Flex justify={"space-between"}>
        <Text mr={"sm"} truncate size="xl">
          {survey.title}
        </Text>
        <SurveyMenu survey={survey} />
      </Flex>
      <Group align={"center"} mt="sm" spacing="xs">
        <Avatar radius={"xl"} />
        <Text size="sm" c="dimmed">
          Created {timeSince}
        </Text>
      </Group>
      <Flex justify={"space-between"} mt="lg">
        <StatusBadge isActive={survey.isActive} />
        <Link href="#" style={{color: theme.colors.blue[9]}} onClick={(e) => {e.stopPropagation()}}>
          <Group spacing="4px">
            <IconMessage />
            <Text>{99} Responses</Text>
          </Group>
        </Link>
      </Flex>
    </Paper>
  );
}

function SurveyMenu({ survey }) {
  const router = useRouter();
  const refreshData = () => {
    router.replace(router.asPath);
  }
  return (
    <Menu width={200}>
      <Menu.Target>
        <ActionIcon onClick={(e) => {e.stopPropagation()}}>
          <IconDots />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(e) => {e.stopPropagation()}}>
        <Menu.Item icon={<IconEdit />}>Edit</Menu.Item>
        <Menu.Item icon={<IconShare />}>Share</Menu.Item>
        <Menu.Item icon={<IconCopy />}>Clone</Menu.Item>
        <Menu.Item icon={<IconTrash />} onClick={() => {
          deleteSurvey(survey.id).then(r => {
            notifications.show({message: "Deleted Successfully"});
          }).catch(e => {
            console.log(e);
            notifications.show({message: "Could not delete"})
          })
          refreshData();
        }}>Delete</Menu.Item>
        <Menu.Item icon={<IconMessage />}>View Responses</Menu.Item>
        <Menu.Item
          icon={survey.isActive ? <IconPlayerPause /> : <IconPlayerPlay />}
        >
          {survey.isActive ? "Pause Survey" : "Resume Survey"}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function StatusBadge({ isActive }) {
  return (
    <Badge color={isActive ? "green" : "yellow"}>
      {isActive ? "Active" : "Paused"}
    </Badge>
  );
}

export async function getServerSideProps(context) {
  return {
    props: {
      surveys: await getSurveys()
    }
  }
}