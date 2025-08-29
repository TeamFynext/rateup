"use client";

import { useContext, useEffect, useState } from "react";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  Paper,
  Stack,
  Tooltip,
} from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useImmer } from "use-immer";

import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { EditableText } from "../../input/EditableText";

export function WaListMessageItemsCreator({ initialSections, saveSections }) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const selectedLangSections = initialSections?.[selectedLanguage] || [];
  const [sections, setSections] = useImmer(selectedLangSections || []);
  const [expanded, setExpanded] = useState(0); // index of expanded section
  const [editingItem, setEditingItem] = useState(null);
  useEffect(() => {
    saveSections(sections);
  }, [sections]);

  useEffect(() => {
    setSections(selectedLangSections);
  }, [selectedLanguage]);

  function handleAddItem(sIndex: number) {
    setSections((draft) => {
      draft[sIndex].rows.push({
        title: "",
        description: "",
      });
    });
  }
  const translations = useTranslations();
  return (
    <Stack gap="4px" p="sm" w="100%">
      {sections?.map(({ rows, title }, sIndex) => {
        const sectionId = `s${sIndex}`;
        return (
          <Paper
            p="sm"
            shadow="lg"
            key={sIndex}
            style={{
              border: ".1px solid rgba(0,0,0,.1)",
            }}
          >
            <Group justify="space-between">
              <EditableText
                text={title}
                setText={(text) => {
                  setSections((draft) => {
                    draft[sIndex].title = text;
                  });
                }}
                id={sectionId}
                editMode={sectionId === editingItem}
                setEditingItem={setEditingItem}
                placeholder={translations(
                  "Section title (Required if more than one section is added)",
                )}
                style={{
                  flexGrow: 1,
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                }}
              />
              <Group>
                <Tooltip label={translations("Delete section")}>
                  <ActionIcon
                    onClick={() => {
                      setSections((draft) => {
                        draft.splice(sIndex, 1);
                      });
                    }}
                  >
                    <IconTrash />
                  </ActionIcon>
                </Tooltip>
                <ActionIcon
                  variant="subtle"
                  onClick={() => {
                    if (expanded === sIndex) {
                      setExpanded(null);
                    } else {
                      setExpanded(sIndex);
                    }
                  }}
                >
                  {expanded === sIndex ? (
                    <IconChevronUp />
                  ) : (
                    <IconChevronDown />
                  )}
                </ActionIcon>
              </Group>
            </Group>
            <Collapse in={expanded === sIndex}>
              <Stack pl="md" py="xs">
                {rows?.map((item, rIndex) => {
                  return (
                    <>
                      <WaListItem
                        item={item}
                        sIndex={sIndex}
                        rIndex={rIndex}
                        editingItem={editingItem}
                        setEditingItem={setEditingItem}
                        setSections={setSections}
                        key={rIndex}
                      />

                      {rows.length - 1 !== rIndex && (
                        <Divider my="4px" key={rIndex} />
                      )}
                    </>
                  );
                })}
                <Button onClick={() => handleAddItem(sIndex)} variant="outline">
                  {translations("Add item")}
                </Button>
              </Stack>
            </Collapse>
          </Paper>
        );
      })}
      <Button
        onClick={() => {
          setExpanded(sections?.length); // expand the new section
          setSections((draft) => {
            draft?.push({
              title: "",
              rows: [
                {
                  title: "",
                  description: "",
                },
              ],
            });
          });
        }}
        mt="xs"
      >
        {translations("Add Section")}
      </Button>
    </Stack>
  );
}

function WaListItem({
  sIndex,
  rIndex,
  item,
  editingItem,
  setEditingItem,
  setSections,
}) {
  const { title, description } = item;
  const row = `s${sIndex}r${rIndex}`;
  const titleIndex = `${row}-title`;
  const descriptionIndex = `${row}-description`;
  const translations = useTranslations();
  const { hovered, ref } = useHover();

  function handleDeleteItem() {
    setSections((draft) => {
      draft[sIndex].rows.splice(rIndex);
    });
  }
  function handleUpdateItem(field, value) {
    setSections((draft) => {
      draft[sIndex].rows[rIndex][field] = value;
    });
  }
  return (
    <Group ref={ref}>
      <Badge>{rIndex + 1}</Badge>
      <Box
        style={{
          flexGrow: 1,
        }}
      >
        <EditableText
          text={title}
          placeholder={translations("Title (Required)")}
          setText={(value) => {
            handleUpdateItem("title", value);
          }}
          id={titleIndex}
          editMode={titleIndex === editingItem}
          setEditingItem={setEditingItem}
        />
        <EditableText
          text={description}
          placeholder={translations("Descriptio (Optinonal)")}
          setText={(value) => handleUpdateItem("description", value)}
          id={descriptionIndex}
          editMode={descriptionIndex === editingItem}
          setEditingItem={setEditingItem}
        />
      </Box>
      <Tooltip label={translations("Delete item")}>
        <ActionIcon
          variant="subtle"
          onClick={handleDeleteItem}
          color="red"
          style={{
            visibility: hovered ? "visible" : "hidden",
          }}
        >
          <IconTrash />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
