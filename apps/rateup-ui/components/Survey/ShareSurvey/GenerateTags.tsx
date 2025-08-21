import React from "react";

import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { IconDatabasePlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ContainedTagInput } from "../../input/ContainedInput/ContainedInput";

const GenerateTags = ({ tagSelectData, setTagSelectData, disabled }) => {
  const handleGenerateTag = () => {
    setTagSelectData((prev) => [...prev, generateRandomString(6)]);
  };
  const translations = useTranslations();
  return (
    <Group gap={4}>
      <ContainedTagInput
        onChange={setTagSelectData}
        value={tagSelectData}
        label={translations("tags")}
        placeholder={translations("Type and enter")}
        maw={300}
        disabled={disabled}
      />
      <Tooltip label={translations("generate random tag")}>
        <ActionIcon onClick={handleGenerateTag} mt={"lg"} disabled={disabled}>
          <IconDatabasePlus />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};

export default GenerateTags;

function generateRandomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}
