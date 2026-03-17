"use client";

import React, { useContext, useEffect, useState } from "react";

import { Group, Input, Stack, Text, Textarea } from "@mantine/core";
import { useExtracted } from "next-intl";

import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import classes from "./Style.module.css";

const TncExtraProps = ({ form }) => {
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const translations = useExtracted();
  const tnc = form.values.tnc?.[selectedLanguage] || {
    title: translations("I agree to"),
    urlTitle: translations("terms and conditions"),
    content: translations(
      "Terms & conditions.... \n conditions 1....\n conditions 3.... \n conditions 3....",
    ),
  };
  const [title, setTitle] = useState(tnc?.title);
  const [urlTitle, setUrlTitle] = useState(tnc?.urlTitle);
  const [content, setContent] = useState(tnc?.content);

  useEffect(() => {
    form.setFieldValue("tnc", {
      ...form.values.tnc,
      [selectedLanguage]: { title, urlTitle, content },
    });
  }, [title, urlTitle, content]);

  return (
    <Stack>
      <Group>
        <Text className={classes["labels"]} fw={600}>
          {translations("Title :")}{" "}
        </Text>
        <Input
          placeholder={translations("eg:  I agree to")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          radius="sm"
          size="sm"
          className={classes["inputs"]}
        />
      </Group>
      <Group>
        <Text className={classes["labels"]} fw={600}>
          {translations("Url Text :")}{" "}
        </Text>
        <Input
          placeholder={translations("eg:  terms and conditions")}
          value={urlTitle}
          onChange={(e) => setUrlTitle(e.target.value)}
          radius="sm"
          size="sm"
          className={classes["inputs"]}
        />
      </Group>
      <Group>
        <Text className={classes["labels"]} fw={600}>
          {translations("Terms Content :")}{" "}
        </Text>
        <Textarea
          placeholder={translations("Terms & Conditions ..........")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={classes["inputs"]}
          size="sm"
        />
      </Group>
    </Stack>
  );
};

export default TncExtraProps;
