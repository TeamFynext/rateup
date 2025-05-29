import React, { useRef, useState } from "react";

import {
  ActionIcon,
  Card,
  CardSection,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import {
  IconAdjustments,
  IconAsterisk,
  IconBulb,
  IconCarouselHorizontal,
  IconChevronDown,
  IconLink,
  IconPhone,
  IconPlus,
  IconShoppingCart,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { z } from "zod";

import { RateupButtonSecondary } from "@/components/Button/RateupButtons";
import {
  ContainedFileInput,
  ContainedMultiSelect,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import { LengthTracker } from "@/components/input/LengthTracker";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import useTranslations from "@/dictionaries/useTranslation";
import { parseStringWithVariables } from "@/pages/dashboard/whatsapp/templates/[templateId]";
import {
  WHATSAPP_BUTTON_TYPE,
  WHATSAPP_TEMPLATE_BROADCAST_TYPE,
} from "@/utils/constants";
import { showErrorToast } from "@/utils/notifications";

import { templateSchema } from "../Schema/templateSchema";
import ButtonInput from "./ButtonInput";
import { TextFormateToolBar } from "./TextFormateToolBar";

const CardCarousel = ({
  form,
}: {
  form: UseFormReturnType<z.infer<typeof templateSchema>>;
}) => {
  function handleMediaCarousel() {
    if (form.values.mediaCarousel.length === 10) {
      showErrorToast("Only 10 cards are allowed");
      return;
    }
    const firstCard = form.values.mediaCarousel[0];
    form.insertListItem("mediaCarousel", {
      body: "",
      format: "IMAGE",
      header: null,
      example: [],
      buttons: firstCard ? firstCard.buttons : [],
    });
  }

  function handleProductCarousel() {}
  const { translations } = useTranslations();
  const [selectedText, setSelectedText] = useState("");
  const contentHistory = useRef([]); // Ref to store content history
  const inputRefs = useRef([]);

  const applyFormatting = (style, index) => {
    let content = form.values.mediaCarousel[index].body;

    if (style.startsWith("{{")) {
      let newContent = content + style;
      form.setFieldValue(`mediaCarousel.${index}.body`, newContent);
      return;
    }
    if (!selectedText) return;
    const formattedText = `${style}${selectedText}${style}`;
    if (!contentHistory.current[index]) {
      contentHistory.current[index] = [];
    }
    contentHistory.current[index].push(content);
    const newContent = content.replace(selectedText, formattedText);
    form.setFieldValue(`mediaCarousel.${index}.body`, newContent);
  };

  const undo = (index) => {
    if (contentHistory.current[index].length > 0) {
      const previousContent = contentHistory.current[index].pop();
      form.setFieldValue(`mediaCarousel.${index}.body`, previousContent);
    }
  };

  const insertValue = (value: string, index) => {
    const input = inputRefs.current[index];
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const newText = text.substring(0, start) + value + text.substring(end);
    form.setFieldValue(`mediaCarousel.${index}.body`, newText);
    const newCursorPosition = start + value.length;
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    input.focus();
  };
  const handleSelect = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    setSelectedText(selectedText?.trim());
  };

  function deleteMediaCard(index) {
    form.removeListItem("mediaCarousel", index);
  }
  function handleButtonSelect(btn, index) {
    const newObject = { type: btn, text: "" };
    const existing = form.values.mediaCarousel[index].buttons.find(
      (b) => b.type === btn,
    );
    if (existing) {
      showErrorToast(`Only one button allowed for this type`);
      return;
    }
    form.insertListItem(`mediaCarousel.${index}.buttons`, newObject);
  }

  return (
    <Stack pt={"sm"}>
      <Menu position="top">
        <MenuTarget>
          <RateupButtonSecondary
            w={"fit-content"}
            radius={"md"}
            rightIcon={<IconChevronDown size={15} />}
            title="Add Carousel"
            fw={600}
            leftIcon={<IconPlus size={15} />}
          />
        </MenuTarget>
        <MenuDropdown>
          <Tooltip
            label={
              form.values.productCarousel
                ? "Remove prodcut card to add media card"
                : ""
            }
            disabled={!form.values.productCarousel}
          >
            <MenuItem
              leftSection={<IconCarouselHorizontal size={16} />}
              onClick={handleMediaCarousel}
              disabled={!!form.values.productCarousel}
            >
              Media Card
            </MenuItem>
          </Tooltip>
          <Tooltip
            disabled={!form.values.mediaCarousel.length}
            label={
              form.values.mediaCarousel.length > 0
                ? "Remove media card to add product card"
                : ""
            }
          >
            <MenuItem
              leftSection={<IconShoppingCart size={16} />}
              onClick={handleProductCarousel}
              disabled={form.values.mediaCarousel.length > 0}
            >
              Catalog Product Card
            </MenuItem>
          </Tooltip>
        </MenuDropdown>
      </Menu>
      {form.values.mediaCarousel.length ? (
        <Card bg={"var(--light-grey-color-2)"} p={"sm"} radius={"md"}>
          <Group fz={14} gap={"xs"} wrap="nowrap" mb={"xs"}>
            <IconBulb size={16} />
            Use the same structure for all cards
          </Group>
          {form.values.mediaCarousel.map((card, index) => (
            <Card withBorder mb={"sm"} radius={"md"} key={index}>
              <CardSection withBorder p={4}>
                <Group justify="space-between">
                  <Text>Card {index + 1}</Text>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => deleteMediaCard(index)}
                  >
                    <IconTrash size={16} color="red" />
                  </ActionIcon>
                </Group>
              </CardSection>
              <Stack>
                <Stack pos={"relative"} gap={0}>
                  <Text fz={14} fw={500}>
                    Body{" "}
                    <sup>
                      {" "}
                      <IconAsterisk color="red" size={5} />
                    </sup>
                  </Text>
                  <Text fz={13}>
                    {
                      translations[
                        "Make your messages personal using variables and get more replies!"
                      ]
                    }
                  </Text>
                  <TextFormateToolBar
                    applyFormatting={(style) => applyFormatting(style, index)}
                    insertValue={(value) => insertValue(value, index)}
                    undo={() => undo(index)}
                    dynamicVariables={parseStringWithVariables(card.body)}
                  />
                  <Textarea
                    ref={(el) => (inputRefs.current[index] = el)}
                    styles={{
                      input: {
                        borderRadius: "0px 0px 12px 12px",
                        paddingRight: 90,
                      },
                      section: {
                        width: "fit-content",
                      },
                    }}
                    placeholder={translations["Enter the text"]}
                    autosize
                    minRows={3}
                    onSelect={handleSelect}
                    {...form.getInputProps(`mediaCarousel.${index}.body`)}
                    rightSection={
                      <LengthTracker
                        length={form?.values?.mediaCarousel[index].body?.length}
                        maxValue={1024}
                        atStart
                      />
                    }
                  />
                </Stack>
                {parseStringWithVariables(card.body).map((data, _index) => (
                  <ContainedTextField
                    key={data}
                    placeholder={`${translations["Enter the content for"]} {{${data}}}`}
                    {...form.getInputProps(
                      `mediaCarousel.${index}.example.${_index}`,
                    )}
                  />
                ))}
                <Group>
                  <ContainedSelection
                    data={[
                      WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE,
                      WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO,
                    ]}
                    {...form.getInputProps(`mediaCarousel.${index}.format`)}
                    label={"Header Format"}
                  />
                  <ContainedFileInput
                    {...form.getInputProps(`mediaCarousel.${index}.header`)}
                    label={
                      card?.header
                        ? `Update ${card.format.toLowerCase()}`
                        : `Choose ${card.format.toLowerCase()}`
                    }
                    w={250}
                    placeholder={"Select"}
                  />
                </Group>
                <CarouselButtonMenu
                  btnLength={card.buttons.length}
                  handleButtonSelect={(btn) => handleButtonSelect(btn, index)}
                />
                {card.buttons.map((btn, btnIndex) => (
                  <Group
                    bg={"var(--light-grey-color-4)"}
                    p={"xs"}
                    key={`${btn.type}_${btnIndex}`}
                    style={{ borderRadius: "5px" }}
                  >
                    <ContainedTextField
                      {...form.getInputProps(
                        `mediaCarousel.${index}.buttons.${btnIndex}.type`,
                      )}
                      readOnly
                      label={"Button Type"}
                    />
                    <ContainedTextField
                      label={"Button Text"}
                      {...form.getInputProps(
                        `mediaCarousel.${index}.buttons.${btnIndex}.text`,
                      )}
                    />
                    {btn.type === WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE ? (
                      <ContainedTextField
                        label={"Url"}
                        {...form.getInputProps(
                          `mediaCarousel.${index}.buttons.${btnIndex}.url`,
                        )}
                      />
                    ) : btn.type === WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER ? (
                      <PhoneInputWithCountry
                        label={"Phone Number"}
                        {...form.getInputProps(
                          `mediaCarousel.${index}.buttons.${btnIndex}.phone_number`,
                        )}
                      />
                    ) : null}
                    <ActionIcon
                      variant="subtle"
                      mt={24}
                      onClick={() =>
                        form.removeListItem(
                          `mediaCarousel.${index}.buttons`,
                          btnIndex,
                        )
                      }
                    >
                      <IconX size={17} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            </Card>
          ))}
        </Card>
      ) : null}
      {form.values.productCarousel && (
        <Group>
          <ContainedSelection />
          <ContainedTextField />
          <ContainedMultiSelect />
        </Group>
      )}
    </Stack>
  );
};

const CarouselButtonMenu = ({ btnLength, handleButtonSelect }) => {
  return (
    <Menu position="top">
      <MenuTarget>
        <RateupButtonSecondary
          w={"fit-content"}
          radius={"md"}
          rightIcon={<IconChevronDown size={15} />}
          title="Add Button"
          fw={600}
          leftIcon={<IconPlus size={15} />}
        />
      </MenuTarget>
      <MenuDropdown>
        <Tooltip
          label={btnLength === 2 ? "Maximum 2 buttons allowed" : ""}
          disabled={btnLength < 2}
        >
          <Menu.Item
            disabled={btnLength === 2}
            leftSection={<IconAdjustments size={16} />}
            onClick={() => handleButtonSelect(WHATSAPP_BUTTON_TYPE.QUICK_REPLY)}
          >
            Quick Reply Button
          </Menu.Item>
        </Tooltip>
        <Tooltip
          label={btnLength === 2 ? "Maximum 2 buttons allowed" : ""}
          disabled={btnLength < 2}
        >
          <Menu.Item
            disabled={btnLength === 2}
            leftSection={<IconLink size={16} />}
            onClick={() =>
              handleButtonSelect(WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE)
            }
          >
            Visit website
          </Menu.Item>
        </Tooltip>
        <Tooltip
          label={btnLength === 2 ? "Maximum 2 buttons allowed" : ""}
          disabled={btnLength < 2}
        >
          <Menu.Item
            disabled={btnLength === 2}
            leftSection={<IconPhone size={16} />}
            onClick={() =>
              handleButtonSelect(WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER)
            }
          >
            Call phone number
          </Menu.Item>
        </Tooltip>
      </MenuDropdown>
    </Menu>
  );
};

export default CardCarousel;
