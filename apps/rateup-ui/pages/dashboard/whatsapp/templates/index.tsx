import {
  ActionIcon,
  Box,
  Flex,
  Group,
  SimpleGrid,
  Space,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconClock,
  IconPlus,
  IconSelector,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  useDeleteWaTemplateMutation,
  useWaTemplates,
} from "../../../../backend/whatsapp/whatsapp.query";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../../../components/Button/RateupButtons";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";
import { SyncTemplatesButton } from "../../../../components/whatsapp/templates/SyncTemplates";
import WaTemplateStatusBadge from "../../../../components/whatsapp/templates/WaTemplateStatusBadge";
import { lexend500 } from "../../../../utils/fonts";
import ConfirmationModal from "../../../../components/Modal/ConfirmationModal";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import SortDropdown, {
  sortData,
} from "../../../../components/Dashboard/SortDropDown";
import InfoButton from "../../../../components/Button/InfoButton";
import RefreshButton from "../../../../components/Button/RefreshButton";
import { docsPath } from "../../../../utils/constants";
import templateCardStyles from "./TemplateCard.module.css";
import TimeSinceText from "../../../../components/LandingPageDashboardPage/LandingPageCard/TimeSinceText";

export default function Template() {
  const { data: templates, isPending } = useWaTemplates();
  const [sortOption, setSortOption] = useState(" ");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [deleteDialogOpened, { toggle, close }] = useDisclosure();
  const templateDeleteMutation = useDeleteWaTemplateMutation(
    () => {
      setSelectedTemplate(null);
    },
    () => {
      setSelectedTemplate(null);
    },
  );

  const router = useRouter();
  if (isPending) return <RateupLoader h={"90dvh"} />;
  // TODO: handle error
  function handleCreateClick() {
    router.push(`/dashboard/whatsapp/templates/create`);
  }
  function handleEditClick(template) {
    router.push(`/dashboard/whatsapp/templates/${template.id}`);
  }

  const onSortChange = (value) => {
    setSortOption(value);
  };

  const sortedTemplates = sortData(templates, sortOption);

  return (
    <Stack h={"100%"}>
      <Flex
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
        >
          <Title order={1} c={"var(--grey-color)"}>
            All Templates
          </Title>
          <InfoButton docUrl={`${docsPath}/whatsappSurvey/template`} />
          <RefreshButton queryKeys={["watemplates"]} />
          <RateupButtonBlue
            title="Create Templates"
            rightIcon={<IconPlus size={"1rem"} />}
            onClick={handleCreateClick}
          />
        </Flex>

        <Flex
          mih={50}
          gap="0.625rem"
          justify="flex-start"
          align="flex-start"
          direction="row"
          wrap="wrap"
        >
          <SortDropdown
            onSortChange={onSortChange}
            defaultSortOption={sortOption}
          />
          <SyncTemplatesButton />
        </Flex>
      </Flex>

      <Box
        className={`cards-grid-global-class`}
        flex={1}
        h={"100%"}
        style={{ overflow: "auto", padding: "5px", paddingRight: "1rem" }}
      >
        {sortedTemplates?.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onClick={() => handleEditClick(t)}
            toggle={toggle}
            setSelectedTemplate={setSelectedTemplate}
          />
        ))}
      </Box>

      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={close}
        headerLabel="Are you sure you want to delete this Template?"
        headerTitle="Delete Template"
        confirmLabel="Delete"
        onConfirm={() => {
          if (selectedTemplate) {
            notifications.show({
              id: "template-delete",
              loading: true,
              title: "Deleting Template",
              message: `Hold on, Template is getting Deleted...`,
              autoClose: false,
              withCloseButton: false,
            });
            templateDeleteMutation.mutate(selectedTemplate);
          }
        }}
      />
    </Stack>
  );
}

function TemplateCard({ template, onClick, toggle, setSelectedTemplate }) {
  return (
    <PaperLayout hoveractive={true} onClick={onClick}>
      <Stack>
        <Flex justify={"space-between"} align={"center"}>
          <Text mr={"sm"} truncate size="lg" fw={600} tt={"capitalize"}>
            {template.data.name}
          </Text>
          <Group>
            <ActionIcon
              variant="subtle"
              c={"var(--light-grey-color-5)"}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTemplate(template.id);
                toggle();
              }}
            >
              <IconTrash />
            </ActionIcon>
          </Group>
        </Flex>
        <Group
          className={templateCardStyles["creation-time-text-and-icon-div"]}
        >
          <Box className={templateCardStyles["clock-icon-container"]}>
            <IconClock />
          </Box>
          <p>Created {<TimeSinceText isoDateString={template.createdAt} />}</p>
        </Group>
        <Group>
          <WaTemplateStatusBadge status={template.data.status} />
          <WaTemplateStatusBadge status={template.data.category} defaultType />
        </Group>
      </Stack>
    </PaperLayout>
  );
}
