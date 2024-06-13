import {
  ActionIcon,
  Flex,
  Group,
  SimpleGrid,
  Space,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus, IconSelector, IconTrash } from "@tabler/icons-react";
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
import { whatsappOptions } from "../../../../utils/constants";
import { lexend500 } from "../../../../utils/fonts";
import ConfirmationModal from "../../../../components/Modal/ConfirmationModal";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import SortDropdown from "../../../../components/Dashboard/SortDropDown";

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
  if (!whatsappOptions?.includes("templates")) {
    router.push("/dashboard/whatsapp/flows");
    return;
  }
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

  const sortedTemplates = [...templates].sort((a, b) => {
    switch (sortOption) {
      case "latest":
        return dayjs(a.createdAt).isBefore(b.createdAt) ? 1 : -1;
      case "oldest":
        return dayjs(b.createdAt).isBefore(a.createdAt) ? 1 : -1;
      case "a-z":
        return a.data.name.localeCompare(b.data.name);
      case "z-a":
        return b.data.name.localeCompare(a.data.name);
      default:
        return 0;
    }
  });

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
          <Title order={1} c={"var(--grey-color)"}>
            All Templates
          </Title>
          <RateupButtonBlue
            title="Create Templates"
            rightIcon={<IconPlus size={"1rem"} />}
            onClick={handleCreateClick}
          />
        </Flex>

        <Flex
          mih={50}
          gap="4"
          justify="flex-start"
          align="flex-start"
          direction="row"
          wrap="wrap"
        >
          <SortDropdown onSortChange={onSortChange} />
          <SyncTemplatesButton />
        </Flex>
      </Flex>

      <Space h="xl" />
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
      <SimpleGrid spacing={"lg"} cols={{ base: 1, sm: 2, lg: 3, xl: 3 }}>
        {sortedTemplates?.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onClick={() => handleEditClick(t)}
            toggle={toggle}
            setSelectedTemplate={setSelectedTemplate}
          />
        ))}
      </SimpleGrid>
    </>
  );
}

function TemplateCard({ template, onClick, toggle, setSelectedTemplate }) {
  return (
    <PaperLayout hoveractive={true} onClick={onClick}>
      <Flex justify={"space-between"} align={"center"}>
        <Text mr={"sm"} truncate size="lg" fw={600} tt={"capitalize"}>
          {template.data.name}
        </Text>
        <Group>
          {/* <ActionIcon variant="transparent" c={"var(--light-grey-color-5)"}>
              <IconCopy />
            </ActionIcon> */}
          <ActionIcon
            variant="transparent"
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
      <WaTemplateStatusBadge status={template.data.category} defaultType />
      <Text c={"var(--light-grey-color-5)"} tt={"capitalize"}>
        Language: {template.data.language}
      </Text>
      <Space h="xl" />
      <Group justify="space-between">
        <Text c={"var(--grey-color)"} ff={lexend500.style.fontFamily}>
          {dayjs(template.createdAt).format("DD/MM/YYYY")}
        </Text>
        <WaTemplateStatusBadge status={template.data.status} />
      </Group>
    </PaperLayout>
  );
}
