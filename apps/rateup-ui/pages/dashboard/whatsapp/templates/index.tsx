import {
  ActionIcon,
  Flex,
  Group,
  Menu,
  SimpleGrid,
  Space,
  Text,
  Title,
} from "@mantine/core";
import { IconDots, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  useDeleteWaTemplateMutation,
  useWaTemplates,
} from "../../../../backend/whatsapp/whatsapp.query";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";
import { SyncTemplatesButton } from "../../../../components/whatsapp/templates/SyncTemplates";
import WaTemplateStatusBadge from "../../../../components/whatsapp/templates/WaTemplateStatusBadge";
import { whatsappOptions } from "../../../../utils/constants";
import { lexend500 } from "../../../../utils/fonts";

export default function Template() {
  const { data: templates, isPending, error } = useWaTemplates();
  const templateDeleteMutation = useDeleteWaTemplateMutation();
  const [sort, setSort] = useState(true);

  const router = useRouter();
  if (!whatsappOptions?.includes("templates")) {
    router.push("/dashboard/whatsapp/flows");
    return;
  }
  if (isPending) return <RateupLoader h={"100dvh"} />;
  // TODO: handle error
  function handleCreateClick() {
    router.push(`/dashboard/whatsapp/templates/create`);
  }
  function handleEditClick(template) {
    router.push(`/dashboard/whatsapp/templates/${template.id}`);
  }
  // TODO: delete template modal
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
          {/* <Menu shadow="md" withArrow>
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
          <RateupButtonPrimary
            onClick={() => setSort(!sort)}
            title={"Sort"}
            variant="subtle"
            color="black"
            sx={{
              fontSize: "15px",
              fontFamily: lexend400.style.fontFamily,
            }}
            rightIcon={<IconChevronDown size="1rem" />}
          /> */}
          <SyncTemplatesButton />
        </Flex>
      </Flex>

      <Space h="xl" />

      <SimpleGrid spacing={"lg"} cols={{ base: 1, sm: 2, lg: 3, xl: 3 }}>
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
    </>
  );
}

function TemplateCard({ template, deleteMutation, onClick, onEditClick }) {
  return (
    <>
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
                deleteMutation.mutate(template.id);
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
    </>
  );
}

function TemplateMenu({ template, deleteMutation, onEditClick }) {
  return (
    <Menu width={200}>
      <Menu.Target>
        <ActionIcon variant="transparent">
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
