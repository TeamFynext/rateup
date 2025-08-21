import { useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Box,
  Flex,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import {
  useDeleteWaTemplateMutation,
  useWaTemplates,
} from "@/backend/whatsapp/whatsapp.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { TemplatesCardListSkeleton } from "@/components/animation/skeleton/wa/TemplatesCardList.skeleton";
import InfoButton from "@/components/Button/InfoButton";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import RefreshButton from "@/components/Button/RefreshButton";
import SortDropdown, { sortData } from "@/components/Dashboard/SortDropDown";
import CreatedSinceText from "@/components/DateAndTime/CreatedSinceText";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import styles from "@/components/WelcomeTour/components/Tour.module.css";
import WaPageTourSteps from "@/components/WelcomeTour/components/WaPageTourSteps";
import WelcomeTour from "@/components/WelcomeTour/WelcomeTour";
import { SyncTemplatesButton } from "@/components/whatsapp/templates/SyncTemplates";
import WaTemplateStatusBadge from "@/components/whatsapp/templates/WaTemplateStatusBadge";
import { docsPath } from "@/utils/constants";

export default function Template() {
  const { data: templates, isPending, isError, refetch } = useWaTemplates();
  const [sortOption, setSortOption] = useState("latest");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [deleteDialogOpened, { toggle, close }] = useDisclosure();
  const { data, isPending: waSettingsPending } = useWaSettings();
  const translations = useTranslations();
  const templateDeleteMutation = useDeleteWaTemplateMutation(
    () => {
      setSelectedTemplate(null);
    },
    () => {
      setSelectedTemplate(null);
    },
  );

  const router = useRouter();
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

  const tourSteps = WaPageTourSteps({ styles });

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
          <Tooltip
            label={translations(
              "Connect a WhatsApp number in settings to create a Template",
            )}
            disabled={!!data}
          >
            <Box>
              <RateupButtonBlue
                className={styles["create-template-button"]}
                title={translations("Create Templates")}
                rightIcon={<IconPlus size={"1rem"} />}
                onClick={handleCreateClick}
                disabled={isPending || !data}
              />
            </Box>
          </Tooltip>
          <InfoButton docUrl={`${docsPath}/whatsappSurvey/template`} />
          <WelcomeTour steps={tourSteps} />
          <RefreshButton queryKeys={["watemplates"]} />
        </Flex>

        <Flex
          mih={50}
          gap="0.625rem"
          justify="flex-start"
          align="flex-start"
          direction="row"
          wrap="wrap"
        >
          <div className={styles["sort-dropdown"]}>
            <SortDropdown
              onSortChange={onSortChange}
              defaultSortOption={sortOption}
            />
          </div>
          <Tooltip
            label={translations(
              "Connect a WhatsApp number in settings to sync Template",
            )}
            disabled={!!data}
          >
            <Box>
              <SyncTemplatesButton disabled={isPending || !data} />
            </Box>
          </Tooltip>
        </Flex>
      </Flex>
      <TemplateCardList
        handleEditClick={handleEditClick}
        isError={isError}
        isPending={isPending}
        refetch={refetch}
        setSelectedTemplate={setSelectedTemplate}
        sortedTemplates={sortedTemplates}
        toggle={toggle}
      />
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={close}
        headerLabel={translations(
          "Are you sure you want to delete this Template?",
        )}
        headerTitle={translations("Delete Template")}
        confirmLabel={translations("Delete")}
        onConfirm={() => {
          if (selectedTemplate) {
            notifications.show({
              id: "template-delete",
              loading: true,
              title: translations("Deleting Template"),
              message: translations("Hold on, Template is getting Deleted..."),
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

const TemplateCardList = ({
  isPending,
  isError,
  refetch,
  sortedTemplates,
  toggle,
  handleEditClick,
  setSelectedTemplate,
}) => {
  if (isPending) return <TemplatesCardListSkeleton />;
  if (isError) return <ErrorComponent refetch={refetch} />;

  return (
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
  );
};
function TemplateCard({ template, onClick, toggle, setSelectedTemplate }) {
  return (
    <PaperLayout hoveractive={true} onClick={onClick} layoutAnimation>
      <Stack>
        <Flex justify={"space-between"} align={"center"}>
          <Text mr={"sm"} truncate size="lg" fw={500}>
            {template.data.name}
          </Text>
          <Group>
            <Tooltip
              label={
                template?._count?.Campaign > 0
                  ? "Cannot delete template with active campaigns"
                  : "Delete template"
              }
              position="left"
            >
              <ActionIcon
                variant="subtle"
                c={"var(--light-grey-color-5)"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (template?._count?.Campaign > 0) return;
                  setSelectedTemplate(template.id);
                  toggle();
                }}
                disabled={template?._count?.Campaign > 0}
                opacity={template?._count?.Campaign > 0 ? 0.5 : 1}
              >
                <IconTrash />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Flex>
        <CreatedSinceText createdAt={template.createdAt} />
        <Group gap={8}>
          <WaTemplateStatusBadge status={template.data.status} />
          <WaTemplateStatusBadge status={template.data.category} defaultType />
          <WaTemplateStatusBadge status={template.templateType} defaultType />
        </Group>
      </Stack>
    </PaperLayout>
  );
}
