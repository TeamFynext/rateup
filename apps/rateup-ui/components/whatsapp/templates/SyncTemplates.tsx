import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Group,
  InputLabel,
  Modal,
  Progress,
  Select,
  Stack,
  Table,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useListState } from "@mantine/hooks";
import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  useRegisterTemplatesMutation,
  useSyncTemplatesMutation,
  useUnregisteredTemplates,
} from "../../../backend/whatsapp/whatsapp.query";
import { showErrorToast } from "../../../utils/notifications";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import { WaResponseMessage } from "../MessageComponents";
import whatsappStyles from "../whatsapp.module.css";
import classes from "./template.module.css";
import WaTemplateStatusBadge from "./WaTemplateStatusBadge";

export function SyncTemplatesModal({ opened, onClose, unregisteredTemplates }) {
  const [selectedTemplates, handlers] = useListState([]);
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(-1);
  const [formattedTemplates, ftHandlers] = useListState<{
    data: any;
    acceptButton: string;
  }>([]);

  const registerTemplateMutation = useRegisterTemplatesMutation();
  const translations = useTranslations();
  // When all templates are configured, send post request to backend to import templates.
  useEffect(() => {
    if (currentTemplateIndex === -1) return;
    if (
      currentTemplateIndex === selectedTemplates.length - 1 &&
      formattedTemplates.length === selectedTemplates.length
    ) {
      registerTemplateMutation.mutate(formattedTemplates);
      handleClose();
    }
  }, [formattedTemplates]);

  if (!unregisteredTemplates || !opened) return null;

  function selectNextTemplate() {
    if (currentTemplateIndex === selectedTemplates.length - 1) {
      return;
    }
    setCurrentTemplateIndex(currentTemplateIndex + 1);
  }

  function selectPreviousTemplate() {
    setCurrentTemplateIndex(currentTemplateIndex - 1);
  }

  // Reset state when modal is closed
  function handleClose() {
    setCurrentTemplateIndex(-1);
    handlers.setState([]);
    ftHandlers.setState([]);
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={translations("Sync Templates")}
      h="80vh"
      size={"lg"}
      closeOnClickOutside={false}
      radius={"lg"}
    >
      {currentTemplateIndex === -1 ? (
        <DisplayTemplates
          selectedTemplates={selectedTemplates}
          unregisteredTemplates={unregisteredTemplates}
          handlers={handlers}
          onImport={selectNextTemplate}
          onClose={onClose}
        />
      ) : currentTemplateIndex < selectedTemplates.length ? (
        <ConfigureTemplate
          template={unregisteredTemplates.find(
            (t) => t.id === selectedTemplates[currentTemplateIndex],
          )}
          ftHandlers={ftHandlers}
          selectNextTemplate={selectNextTemplate}
          selectPreviousTemplate={selectPreviousTemplate}
          templateIndex={currentTemplateIndex}
          totalTemplates={selectedTemplates.length}
          key={currentTemplateIndex}
          isSubmitting={registerTemplateMutation.isPending}
        />
      ) : null}
    </Modal>
  );
}

/**
 * Allows user to set the 'acceptButton' of template before importing.
 */

function ConfigureTemplate({
  template,
  templateIndex,
  totalTemplates,
  ftHandlers,
  selectNextTemplate,
  selectPreviousTemplate,
  isSubmitting,
}) {
  const body = template.components.find((c) => c.type.toLowerCase() === "body");
  const header = template.components.find(
    (c) => c.type.toLowerCase() === "header",
  );
  const footer = template.components.find(
    (c) => c.type.toLowerCase() === "footer",
  );
  const buttons = template.components
    .find((c) => c.type.toLowerCase() === "buttons")
    .buttons.map(({ text }) => text);
  const [acceptButton, setAcceptButton] = useState("");

  function handleNext() {
    ftHandlers.append({
      data: template,
      acceptButton,
    });
    selectNextTemplate();
  }
  const translations = useTranslations();
  return (
    <Stack>
      <Progress value={((templateIndex + 1) / totalTemplates) * 100} />
      <ContainedTextField
        label={translations("Template Name")}
        value={template.name}
        readOnly
      />
      <InputLabel>{translations("Preview")}</InputLabel>
      <Box
        className={whatsappStyles.chatBg}
        p="lg"
        style={{
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <WaResponseMessage
          body={body.text}
          header={header?.text}
          footer={footer?.text}
          quickReplyButtons={buttons}
        />
      </Box>
      <Tooltip
        label={translations(
          "Clicking on this acceptButton will start the survey",
        )}
      >
        <Select
          label={translations("Choose Accept-Button")}
          value={acceptButton}
          onChange={(value) => setAcceptButton(value)}
          data={buttons}
        />
      </Tooltip>
      <Group
        justify="space-between"
        style={{
          position: "sticky",
          bottom: "0px",
        }}
        pt="xs"
      >
        <Button
          variant="outline"
          leftSection={<IconChevronLeft size={20} />}
          disabled={templateIndex === 0}
          onClick={selectPreviousTemplate}
        >
          {translations("Previous")}
        </Button>
        <Button
          rightSection={
            templateIndex === totalTemplates - 1 ? undefined : (
              <IconChevronRight size={20} />
            )
          }
          disabled={acceptButton === ""}
          onClick={handleNext}
          loading={isSubmitting}
        >
          {templateIndex === totalTemplates - 1
            ? translations("Import Templates")
            : translations("Next")}
        </Button>
      </Group>
    </Stack>
  );
}

/**
 * Displays list of templates in which user can select which templates to import.
 * @param param0
 * @returns
 */
function DisplayTemplates({
  selectedTemplates,
  unregisteredTemplates,
  handlers,
  onImport,
  onClose,
}) {
  function handleSelect(selected: boolean, id: string) {
    if (selected) {
      if (!selectedTemplates.includes(id)) {
        handlers.append(id);
      }
    } else {
      if (selectedTemplates.includes(id)) {
        handlers.remove(
          selectedTemplates.findIndex((templateId) => templateId === id),
        );
      }
    }
  }
  function handleMasterSelect(selected: boolean) {
    if (selected) {
      handlers.setState(unregisteredTemplates.map((template) => template.id));
    } else {
      handlers.setState([]);
    }
  }
  const allChecked = selectedTemplates.length === unregisteredTemplates?.length;
  const translations = useTranslations();
  return (
    <Flex direction={"column"} h="80vh">
      <Table.ScrollContainer
        minWidth={"100%"}
        style={{
          position: "relative",
          flexGrow: 1,
        }}
      >
        <Table>
          <Table.Thead
            style={{
              position: "sticky",
              top: "0px",
              backgroundColor: "white",
              zIndex: 1,
              boxShadow: "0px 0px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Table.Tr>
              <Table.Th>
                <Checkbox
                  checked={allChecked}
                  indeterminate={selectedTemplates.length > 0 && !allChecked}
                  onChange={(event) =>
                    handleMasterSelect(event.currentTarget.checked)
                  }
                />
              </Table.Th>
              <Table.Th>{translations("Template")}</Table.Th>
              <Table.Th>{translations("Status")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody w="100%">
            {unregisteredTemplates.map((template) => (
              <Table.Tr key={template.id}>
                <Table.Td>
                  <Checkbox
                    checked={selectedTemplates.includes(template.id)}
                    onChange={(event) =>
                      handleSelect(event.currentTarget.checked, template.id)
                    }
                  />
                </Table.Td>
                <Table.Td>{template.name}</Table.Td>
                <Table.Td>
                  <WaTemplateStatusBadge status={template.status} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Group
        justify="end"
        style={{
          position: "sticky",
          bottom: "0px",
        }}
        pt="xs"
      >
        <Button variant="outline" onClick={onClose}>
          {translations("Cancel")}
        </Button>
        <Button disabled={selectedTemplates.length === 0} onClick={onImport}>
          {translations("Import")}
        </Button>
      </Group>
    </Flex>
  );
}

export function ImportTemplatesButton() {
  const [openModal, { open, close }] = useDisclosure(false);
  const translations = useTranslations();
  const {
    data: unregisteredTemplates,
    isLoading,
    error,
    isError,
  } = useUnregisteredTemplates(openModal);

  if (error) {
    showErrorToast(translations("Error syncing templates"));
    console.error(error);
  }

  return (
    <>
      <Button
        leftSection={
          <IconRefresh
            className={isLoading && openModal ? classes.rotateInfinitely : ""}
          />
        }
        variant="outline"
        onClick={open}
        radius={"lg"}
      >
        {translations("Import")}
      </Button>
      <SyncTemplatesModal
        opened={openModal && !isLoading && !isError}
        onClose={close}
        unregisteredTemplates={unregisteredTemplates}
      />
    </>
  );
}

export function SyncTemplatesButton({ disabled = false }) {
  const syncMutation = useSyncTemplatesMutation();
  const translations = useTranslations();
  function handleSyncClick() {
    syncMutation.mutate();
  }

  return (
    <Button
      leftSection={
        <IconRefresh
          className={syncMutation.isPending ? classes.rotateInfinitely : ""}
        />
      }
      variant="outline"
      onClick={handleSyncClick}
      radius={"lg"}
      disabled={disabled}
    >
      {translations("Sync")}
    </Button>
  );
}
